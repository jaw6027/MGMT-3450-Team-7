import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../apps/social-studio/server.mjs';
import {createCustomerApp} from '../apps/customer-dashboard/server.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const listen=(server,port)=>new Promise((accept,reject)=>{
  const onError=error=>reject(error);
  server.once('error',onError);
  server.listen(port,'127.0.0.1',()=>{
    server.removeListener('error',onError);
    accept();
  });
});
const close=server=>new Promise(resolveClose=>{
  if(!server.listening)return resolveClose();
  server.close(()=>resolveClose());
});
const port=value=>{
  const parsed=Number(value);
  if(!Number.isInteger(parsed)||parsed<0||parsed>65535)throw new Error('Preview ports must be integers between 0 and 65535.');
  return parsed;
};

export async function startPreviews({socialPort=3000,customerPort=3001,dataDir=resolve(root,'apps/social-studio/data'),customerDataDir=resolve(root,'apps/customer-dashboard/data')}={}) {
  socialPort=port(socialPort);customerPort=port(customerPort);
  const social=createApp({demo:true,dataDir,secure:false});
  let customer;
  try{customer=createCustomerApp({demo:true,dataDir:customerDataDir,secure:false});}catch(error){social.db.close();customer?.db.close();throw error;}
  const results=await Promise.allSettled([listen(social.server,socialPort),listen(customer.server,customerPort)]);
  const failure=results.find(r=>r.status==='rejected');
  if(failure){
    await Promise.all([close(social.server),close(customer.server)]);social.db.close();customer?.db.close();
    if(failure.reason.code==='EADDRINUSE')throw new Error('A preview port is already in use. Stop that preview or set SOCIAL_PORT and CUSTOMER_PORT to unused ports.');
    throw failure.reason;
  }
  let stopped=false;
  return {
    socialUrl:'http://127.0.0.1:'+social.server.address().port,
    customerUrl:'http://127.0.0.1:'+customer.server.address().port,
    async stop(){
      if(stopped)return;stopped=true;
      await Promise.all([close(social.server),close(customer.server)]);
      social.db.close();customer?.db.close();
    }
  };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const previews=await startPreviews({socialPort:process.env.SOCIAL_PORT??3000,customerPort:process.env.CUSTOMER_PORT??3001,...(process.env.PREVIEW_DATA_DIR?{dataDir:process.env.PREVIEW_DATA_DIR}:{}),...(process.env.CUSTOMER_DATA_DIR?{customerDataDir:process.env.CUSTOMER_DATA_DIR}:{})});
    console.log('Both previews are running on this computer. Keep this Terminal window open.');
    console.log('Social Studio: '+previews.socialUrl+' (choose Open demonstration)');
    console.log('Customer Dashboard: '+previews.customerUrl);
    console.log('Demonstration data only. No real posts, messages, invoices or payments are sent.');
    const shutdown=()=>previews.stop().catch(error=>{console.error(error.message);process.exitCode=1;});
    process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  }catch(error){console.error('Could not start previews: '+error.message);process.exitCode=1;}
}
