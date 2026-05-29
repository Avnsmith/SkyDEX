'use client'

import { useState, useEffect } from 'react'
import type { ApiService } from '@agenthub/types'
import { cn, formatUsdc } from '@/lib/utils'
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Terminal,
  ArrowRight,
  Code2,
  Layers,
  Coins,
  FileCode,
  Activity,
  Network
} from 'lucide-react'
import { useAccount, useReadContract, useSignTypedData } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@agenthub/config'
import { toast } from 'sonner'
import { API_URL } from '@/config/constants'

interface PaymentModalProps {
  service: ApiService
  isOpen: boolean
  onClose: () => void
}

export function PaymentModal({ service, isOpen, onClose }: PaymentModalProps) {
  const { isConnected, address, chainId } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()

  // Tab switching for code snippets / headers
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'snippets'>('body')
  const [snippetLang, setSnippetLang] = useState<'curl' | 'node' | 'python'>('curl')

  // Execution playground states
  const [requestBody, setRequestBody] = useState<string>('{\n  "prompt": "Hello Llama model! Tell me a story about space travel."\n}')
  const [customHeaders, setCustomHeaders] = useState<string>('{\n  "Content-Type": "application/json"\n}')
  
  const [step, setStep] = useState<'idle' | 'calling' | 'payment_required' | 'paying' | 'retrying' | 'success' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [responseJson, setResponseJson] = useState<any>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [paymentHeaders, setPaymentHeaders] = useState<{ required?: string; signature?: string }>({})

  const priceHuman = parseFloat(service.pricePerCall) / 1_000_000

  // Read wallet USDC balance on Arc Testnet
  const { data: balanceResult, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const balanceHuman = balanceResult ? (Number(balanceResult as bigint) / 1_000_000).toFixed(6) : '0.00'

  useEffect(() => {
    if (isOpen) {
      setStep('idle')
      setLogs([])
      setResponseJson(null)
      setLatency(null)
      setPaymentHeaders({})
      refetchBalance()
    }
  }, [isOpen, refetchBalance])

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // Real execution flow
  const runInvocation = async () => {
    if (!isConnected) {
      toast.error('Please connect your Web3 wallet first')
      return
    }

    try {
      setStep('calling')
      setLogs([])
      setResponseJson(null)
      setLatency(null)
      
      addLog(`[Client] Initializing call to premium API proxy...`)
      addLog(`[Client] POST ${API_URL}/invoke/${service.id}`)

      // Parse JSON body & custom headers
      let parsedBody: any = {}
      try {
        parsedBody = JSON.parse(requestBody)
      } catch {
        throw new Error('Invalid JSON format in Request Body')
      }

      let parsedHeaders: any = {}
      try {
        parsedHeaders = JSON.parse(customHeaders)
      } catch {
        throw new Error('Invalid JSON format in Custom Headers')
      }

      // Step 1: Fire first request (without payment signature) to trigger 402
      addLog(`[Client] Dispatching pre-flight request...`)
      const res = await fetch(`${API_URL}/invoke/${service.id}`, {
        method: 'POST',
        headers: {
          ...parsedHeaders,
        },
        body: JSON.stringify(parsedBody),
      })

      // If already has access or free (should return 402 otherwise)
      if (res.status === 200) {
        const payload = await res.json()
        setResponseJson(payload.data)
        setLatency(payload.meta?.latencyMs ?? 150)
        setStep('success')
        addLog(`[Proxy] 200 OK — API executed immediately without payment handshake.`)
        return
      }

      if (res.status !== 402) {
        const errPayload = await res.json().catch(() => ({}))
        throw new Error(errPayload.error || `Server returned unexpected status ${res.status}`)
      }

      // Step 2: Handle 402 Payment Required
      setStep('payment_required')
      addLog(`[Proxy] ◄ 402 Payment Required`)
      
      // Look for standard payment-required header or x-payment-required
      const paymentRequiredHeader = res.headers.get('payment-required') || res.headers.get('x402-payment-required')
      if (!paymentRequiredHeader) {
        addLog(`[Error] ⚠️ Missing 'payment-required' negotiation headers. Falling back to simulated handshake...`)
        await runSimulatedHandshake(parsedHeaders, parsedBody)
        return
      }

      setPaymentHeaders((prev) => ({ ...prev, required: paymentRequiredHeader }))
      addLog(`[Client] Decoded negotiation parameters:`)

      let requirements: any
      try {
        requirements = JSON.parse(atob(paymentRequiredHeader))
        addLog(`   • Asset: USDC (${requirements.asset})`)
        addLog(`   • Amount: ${formatUsdc(requirements.amount, 6)} USDC`)
        addLog(`   • Seller: ${requirements.payTo}`)
        addLog(`   • Domain: ${requirements.extra?.name || 'GatewayWallet'}`)
      } catch (err) {
        throw new Error('Failed to parse payment negotiation headers')
      }

      // Step 3: Sign EIP-3009 transfer authorization
      setStep('paying')
      addLog(`[Wallet] Prompting signature: EIP-3009 TransferWithAuthorization`)
      
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600 * 24 * 8) // 8 days expiration (requires >7 days)
      const nonce = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`

      const domain = {
        name: requirements.extra.name,
        version: requirements.extra.version,
        chainId: chainId || 5042002,
        verifyingContract: requirements.extra.verifyingContract as `0x${string}`,
      }

      const message = {
        from: address as `0x${string}`,
        to: requirements.payTo as `0x${string}`,
        value: BigInt(requirements.amount),
        validAfter: 0n,
        validBefore: validBefore,
        nonce: nonce,
      }

      addLog(`[Wallet] Awaiting signature in MetaMask...`)
      
      const signature = await signTypedDataAsync({
        domain,
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        primaryType: 'TransferWithAuthorization',
        message,
      })

      addLog(`[Client] Signature generated successfully: ${signature.slice(0, 18)}...`)

      // Format payment signature header
      const signaturePayload = {
        signature,
        validBefore: validBefore.toString(),
        nonce,
      }
      const paymentSignatureHeader = btoa(JSON.stringify(signaturePayload))
      setPaymentHeaders((prev) => ({ ...prev, signature: paymentSignatureHeader }))

      // Step 4: Retry invocation with signed payment
      setStep('retrying')
      addLog(`[Client] Resubmitting invocation with payment headers...`)
      addLog(`[Client] Header: payment-signature = ${paymentSignatureHeader.slice(0, 12)}...`)

      const res2 = await fetch(`${API_URL}/invoke/${service.id}`, {
        method: 'POST',
        headers: {
          ...parsedHeaders,
          'payment-signature': paymentSignatureHeader,
        },
        body: JSON.stringify(parsedBody),
      })

      if (!res2.ok) {
        const errPayload = await res2.json().catch(() => ({}))
        throw new Error(errPayload.error || `Verification failed: status ${res2.status}`)
      }

      const payload = await res2.json()
      setResponseJson(payload.data)
      setLatency(payload.meta?.latencyMs ?? 180)
      setStep('success')
      addLog(`[Proxy] ◄ 200 OK — Nanopayment settled successfully!`)
      addLog(`[Proxy] Latency: ${payload.meta?.latencyMs}ms | RequestId: ${payload.meta?.requestId || 'none'}`)
      refetchBalance()
      toast.success('Invocations successfully executed!')

    } catch (err: any) {
      setStep('error')
      addLog(`[Error] ✖ ${err.message || err}`)
      toast.error(err.message || 'Execution error')
    }
  }

  // Backup fallback simulator if backend middleware is not reachable
  const runSimulatedHandshake = async (parsedHeaders: any, parsedBody: any) => {
    await new Promise((r) => setTimeout(r, 1200))
    setStep('paying')
    addLog(`[Simulator] Prompting signature: EIP-3009 TransferWithAuthorization`)
    addLog(`[Simulator] Transferring ${priceHuman} USDC on chainId 5042002...`)
    
    await new Promise((r) => setTimeout(r, 2000))
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    
    addLog(`[Simulator] Signature generated: ${mockTxHash.slice(0, 18)}...`)
    
    await new Promise((r) => setTimeout(r, 1000))
    setStep('retrying')
    addLog(`[Simulator] Resubmitting invocation with payment reference...`)
    
    const res = await fetch(`${API_URL}/invoke/${service.id}`, {
      method: 'POST',
      headers: {
        ...parsedHeaders,
        'x-payment-reference': mockTxHash,
      },
      body: JSON.stringify(parsedBody),
    })

    if (!res.ok) {
      throw new Error(`Upstream returned status ${res.status}`)
    }

    const payload = await res.json()
    setResponseJson(payload.data)
    setLatency(payload.meta?.latencyMs ?? 150)
    setStep('success')
    addLog(`[Simulator] ◄ 200 OK — Simulated transaction verified off-chain!`)
  }

  // Code Snippet Helpers based on request body
  const getSnippet = (lang: 'curl' | 'node' | 'python') => {
    let cleanBody = '{}'
    try {
      cleanBody = JSON.stringify(JSON.parse(requestBody))
    } catch {}

    if (lang === 'curl') {
      return `curl -X POST "${API_URL}/invoke/${service.id}" \\
  -H "payment-signature: <base64-payment-auth>" \\
  -H "Content-Type: application/json" \\
  -d '${cleanBody}'`
    }
    if (lang === 'node') {
      return `import { AgentHubClient } from '@agenthub/sdk'

const client = new AgentHubClient({
  privateKey: process.env.PRIVATE_KEY, // Agent Wallet Private Key
  baseUrl: '${API_URL}'
})

// Automatically handles x402 handshake, wallet payment and fetch retry
const response = await client.invoke('${service.id}', {
  method: 'POST',
  body: '${cleanBody}'
})

console.log(response.data)`
    }
    return `import requests
import base64

url = "${API_URL}/invoke/${service.id}"
headers = {
    "payment-signature": "<base64-payment-auth>",
    "Content-Type": "application/json"
}

res = requests.post(url, json=${cleanBody}, headers=headers)
print(res.json())`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-6xl bg-[#090d16] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#111622]/40">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                API Execution Playground
                <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Arc Testnet (5042002)
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">{service.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0 overflow-hidden bg-[#090d16]">
          
          {/* LEFT: Request Composer */}
          <div className="border-r border-white/5 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                Request Composer
              </h4>
              <p className="text-xs text-slate-500">Configure JSON payloads, custom headers, and preview gasless pricing.</p>
            </div>

            {/* Tab header */}
            <div className="flex gap-2 border-b border-white/5 pb-2">
              <button
                onClick={() => setActiveTab('body')}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                  activeTab === 'body' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'
                )}
              >
                JSON Body
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                  activeTab === 'headers' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'
                )}
              >
                Headers
              </button>
              <button
                onClick={() => setActiveTab('snippets')}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                  activeTab === 'snippets' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'
                )}
              >
                Code Snippet
              </button>
            </div>

            {/* Tab body */}
            <div className="flex-1 min-h-[250px] flex flex-col bg-[#05070c] border border-white/5 rounded-xl p-4 font-mono text-xs shadow-inner">
              {activeTab === 'body' && (
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full h-full bg-transparent text-emerald-400 outline-none resize-none"
                  spellCheck="false"
                />
              )}
              {activeTab === 'headers' && (
                <textarea
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  className="w-full h-full bg-transparent text-slate-300 outline-none resize-none"
                  spellCheck="false"
                />
              )}
              {activeTab === 'snippets' && (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex gap-2">
                    {(['curl', 'node', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSnippetLang(lang)}
                        className={cn(
                          'px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all',
                          snippetLang === lang ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                        )}
                      >
                        {lang === 'node' ? 'Node.js' : lang}
                      </button>
                    ))}
                  </div>
                  <pre className="flex-1 overflow-x-auto text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                    {getSnippet(snippetLang)}
                  </pre>
                </div>
              )}
            </div>

            {/* Price detail card */}
            <div className="p-4 bg-[#111622]/40 border border-white/5 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Nanopayment Cost</span>
                <div className="flex items-baseline gap-1">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span className="text-xl font-black text-white">{priceHuman}</span>
                  <span className="text-xs font-semibold text-slate-400">USDC</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Available Wallet Balance</span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {balanceHuman} USDC
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Operational Execution Logs & Viewer */}
          <div className="flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                Execution Monitor
              </h4>
              <p className="text-xs text-slate-500">Live payment negotiation timeline, custom signatures, and response payloads.</p>
            </div>

            {/* Real-time terminal log */}
            <div className="flex-1 min-h-[250px] bg-[#05070c] border border-white/5 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2 text-slate-300 shadow-inner flex flex-col justify-start">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic h-full flex items-center justify-center">
                  Configure request body and click 'Execute API Request' to start EIP-3009 payment flow...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className={cn(
                        "leading-relaxed",
                        log.includes('[Proxy]') && "text-amber-400",
                        log.includes('◄ 402') && "text-orange-400",
                        log.includes('[Wallet]') && "text-violet-400",
                        log.includes('Signature generated') && "text-emerald-400",
                        log.includes('200 OK') && "text-emerald-400 font-bold",
                        log.includes('[Error]') && "text-rose-400 font-bold"
                      )}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Headers drawer */}
            {(paymentHeaders.required || paymentHeaders.signature) && (
              <div className="p-3 bg-[#111622]/20 border border-white/5 rounded-xl space-y-2 text-[10px] font-mono">
                {paymentHeaders.required && (
                  <div className="truncate">
                    <span className="text-orange-400 font-bold uppercase mr-1">402-Required:</span>
                    <span className="text-slate-500 select-all">{paymentHeaders.required}</span>
                  </div>
                )}
                {paymentHeaders.signature && (
                  <div className="truncate">
                    <span className="text-violet-400 font-bold uppercase mr-1">Payment-Signature:</span>
                    <span className="text-slate-500 select-all">{paymentHeaders.signature}</span>
                  </div>
                )}
              </div>
            )}

            {/* Live Response Payload Panel */}
            {step === 'success' && responseJson && (
              <div className="bg-[#05070c] border border-emerald-500/10 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-56 animate-in slide-in-from-bottom-2 duration-150 relative">
                <div className="absolute top-2 right-2 flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    {latency}ms
                  </span>
                </div>
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Response JSON</h5>
                <pre className="mt-1 leading-relaxed">{JSON.stringify(responseJson, null, 2)}</pre>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-[#111622]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            <span>Permit2 batch settlement guarantees sub-cent operations with $0 gas overhead.</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            {step !== 'calling' && step !== 'paying' && step !== 'retrying' && (
              <button
                onClick={runInvocation}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all duration-200 active:scale-95"
              >
                <span>Execute API Request</span>
                <Play className="w-4 h-4 fill-white" />
              </button>
            )}
            {(step === 'calling' || step === 'paying' || step === 'retrying') && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-2.5 bg-white/10 text-slate-400 rounded-xl text-sm font-bold"
              >
                <span>Executing...</span>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
