import {loadEnv} from 'vite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function assertBrowserEnvironment(env) {
  const missing=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].filter(name=>!env[name]?.trim());
  if(missing.length)throw new Error('Build stopped: missing browser configuration: '+missing.join(', '));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {assertBrowserEnvironment(loadEnv('production',process.cwd(),'VITE_'));console.log('Browser connection configuration is present.');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
