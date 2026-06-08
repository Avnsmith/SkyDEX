'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { SiweMessage } from 'siwe'
import { toast } from 'sonner'
import { API_URL } from '@/config/constants'

interface AuthContextValue {
  token: string | null
  address: string | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  address: null,
  isAuthenticated: false,
  isLoading: false,
  signIn: async () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Restore token from localStorage on mount / address change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('agenthub_token')
    const storedAddress = localStorage.getItem('agenthub_address')
    if (stored && storedAddress && storedAddress.toLowerCase() === address?.toLowerCase()) {
      setToken(stored)
    } else if (stored && storedAddress !== address?.toLowerCase()) {
      localStorage.removeItem('agenthub_token')
      localStorage.removeItem('agenthub_address')
      setToken(null)
    }
  }, [address])

  const signIn = useCallback(async () => {
    if (!address || !chainId) {
      toast.error('Please connect your wallet first')
      return
    }
    setIsLoading(true)
    try {
      // 1. Get nonce from backend
      const nonceRes = await fetch(`${API_URL}/auth/nonce?address=${address}`)
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce')
      const { nonce } = (await nonceRes.json()) as { nonce: string }

      // 2. Build SIWE message
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to AgentHub marketplace',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      })
      const message = siweMessage.prepareMessage()

      // 3. Request wallet signature
      const signature = await signMessageAsync({ message })

      // 4. Verify on backend
      const verifyRes = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address }),
      })
      if (!verifyRes.ok) throw new Error('Signature verification failed')

      const { token: newToken } = (await verifyRes.json()) as { token: string }
      setToken(newToken)
      localStorage.setItem('agenthub_token', newToken)
      localStorage.setItem('agenthub_address', address.toLowerCase())
      toast.success('Signed in successfully')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')) {
        toast.error('Signature rejected by wallet')
      } else {
        toast.error(`Sign-in failed: ${msg}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [address, chainId, signMessageAsync])

  const signOut = useCallback(() => {
    setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agenthub_token')
      localStorage.removeItem('agenthub_address')
    }
    disconnect()
    toast.success('Signed out')
  }, [disconnect])

  return (
    <AuthContext.Provider
      value={{
        token,
        address: address?.toLowerCase() ?? null,
        isAuthenticated: !!token,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
