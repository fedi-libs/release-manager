import { Hono } from 'hono/quick';
import { verifyGithubSignature } from './github';
import { generateGitHubJWT } from './jwt';

interface HonoEnv extends Env {} 
declare const APP_VERSION: string;

const app = new Hono<{ Bindings: Env }>()

app.post('/rm/hook', async (c) => {
  const body = await c.req.arrayBuffer();
  const signature = c.req.header('x-hub-signature-256');

  if (!await verifyGithubSignature(signature, body, c.env.GITHUB_WEBHOOK_SECRET)) {
    return c.text('Unauthorized', 401);
  }
  
  if (c.req.header('x-github-event') === "ping") {
    return c.json({
      message: 'pong! :D'
    }, 200)
  }
  
  const json = await c.req.json();
  if (json.action !== 'created' || !json.release?.draft) {
    return c.text('Skipped', 200);
  }

  const commonHeaders = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': `release-manager/${APP_VERSION} (https://github.com/fedi-libs/release-manager)`,
  };

  try {
    const jwt = await generateGitHubJWT(c.env.GITHUB_APP_ID, c.env.GITHUB_PRIVATE_KEY);

    const authRes = await fetch(`https://api.github.com/app/installations/${c.env.GITHUB_INSTALLATION_ID}/access_tokens`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${jwt}` },
    });
    const { token } = await authRes.json() as { token: string };

    const repo = json.repository.full_name;
    const dispatchRes = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${token}`, 'event_type': 'on-draft-release-created' },
      body: JSON.stringify({ ref: 'main' }),
    });

    if (!dispatchRes.ok) {
      console.log(await dispatchRes.json());
    };
    
    const resTxt = dispatchRes.ok ? 'Success' : 'Dispatch Failed';
    return c.text(resTxt, dispatchRes.status as any);
  } catch (err) {
    console.error(err);
    return c.text('Internal Server Error', 500);
  }
})

export default app
