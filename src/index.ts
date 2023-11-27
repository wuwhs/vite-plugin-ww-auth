// 企业微信自动鉴权插件
import { Plugin } from "vite";
import sha1 from "sha1";
import axios from "axios";
import type { WwAuthPluginOptions, WwAuthInfo } from 'vite-plugin-ww-auth'; 

const WwAuthPlugin = function (options: WwAuthPluginOptions): Plugin {
  const { corpid, corpsecret, noncestr, timestamp, url, agentid } = options;

  let wwAuthInfo: WwAuthInfo = {
    corpsign: "",
    appsign: "",
    corpid: "",
    corpsecret: "",
    noncestr: "",
    timestamp: "",
    url: "",
    agentid: ""
  };

  // 获取token
  const getAccessToken = async () => {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
      params: {
        corpid,
        corpsecret,
      },
    });
  };

  // 获取企业ticket
  const getCorpTicket = async (token: string) => {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket",
      params: {
        access_token: token,
      },
    });
  };

  // 获取应用ticket
  const getAppTicket = async (token: string) => {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/ticket/get",
      params: {
        access_token: token,
        type: "agent_config",
      },
    });
  };

  // 加密ticket
  const encrypTicket = (ticket: string) => {
    const str = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    return sha1(str);
  };
  // 加载标志，只加载一次
  let flag = false;

  return {
    name: "vite-plugin-ww-auth",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!flag) {
          try {
            const tokenResult = await getAccessToken();

            if (tokenResult.data.errcode !== 0) {
              console.log("获取token失败：", JSON.stringify(tokenResult.data));
              return;
            }

            // token过期
            setTimeout(() => {
              console.log("token过期，页面更新后为您重新获取");
              flag = false;
            }, tokenResult.data.expires_in * 1000);

            const token = tokenResult.data.access_token;
            const corpResult = await getCorpTicket(token);
            if (corpResult.data.errcode !== 0) {
              console.log(
                "获取企业ticket失败：",
                JSON.stringify(corpResult.data)
              );
              return;
            }

            const appResult = await getAppTicket(token);
            if (appResult.data.errcode !== 0) {
              console.log(
                "获取应用ticket失败： ",
                JSON.stringify(appResult.data)
              );
            }

            wwAuthInfo = {
              corpsign: encrypTicket(corpResult.data.ticket),
              appsign: encrypTicket(appResult.data.ticket),
              corpid,
              corpsecret,
              noncestr,
              timestamp,
              url,
              agentid,
            };
            flag = true;
          } catch (error: any) {
            console.log("企业微信鉴权错误:", error.message);
            flag = false;
          }
        }
        next();
      });
    },
    transformIndexHtml(html: string) {
      // 在 HTML 中注入获取到的 token
      return html.replace(
        "</head>",
        `<script>window.__wwAuthInfo__ = ${JSON.stringify(
          wwAuthInfo
        )};</script></head>`
      );
    },
  };
};

export default WwAuthPlugin;
