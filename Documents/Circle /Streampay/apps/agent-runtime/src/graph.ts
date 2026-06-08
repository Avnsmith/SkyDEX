import { StateGraph, END } from "@langchain/langgraph";

export interface AgentState {
  input: string;
  output: string;
  computeSeconds: number;
  tokensGenerated: number;
}

const graphState = {
  input: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  output: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  computeSeconds: {
    value: (x: number, y: number) => x + (y ?? 0),
    default: () => 0,
  },
  tokensGenerated: {
    value: (x: number, y: number) => x + (y ?? 0),
    default: () => 0,
  }
};

const processTaskNode = async (state: AgentState) => {
  // Simulate AI compute and generation
  return {
    output: `Processed: ${state.input}`,
    computeSeconds: 5,
    tokensGenerated: 150
  };
};

const workflow = new StateGraph<AgentState>({ channels: graphState })
  .addNode("process", processTaskNode)
  .addEdge("process", END)
  .setEntryPoint("process");

export const agentApp = workflow.compile();
