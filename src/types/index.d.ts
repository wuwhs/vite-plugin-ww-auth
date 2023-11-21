import { Plugin } from "vite";

interface WwAuthPluginOptions {
  corpid: string;
  corpsecret: string;
  noncestr: string;
  timestamp: number;
  url: string;
  agentid: number;
}

declare const WwAuthPlugin: (options: WwAuthPluginOptions) => Plugin;

export default WwAuthPlugin;
