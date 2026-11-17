require('dotenv').config();
const test=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken'),prisma=require('../src/config/prisma');
const {io}=require('../../frontend/node_modules/socket.io-client');
test('socket persiste mensagem e histórico HTTP retorna nos dois sentidos',async()=>{
 const ids=[require('crypto').randomUUID(),require('crypto').randomUUID()];let sender,receiver;
 try{
 await prisma.user.createMany({data:ids.map(id=>({id,name:'Teste chat temporário',email:id+'@example.invalid',cpf:id,password:'not-used',role:'employee'}))});
 const tokens=ids.map(id=>jwt.sign({id,role:'employee'},process.env.JWT_SECRET,{expiresIn:'5m'}));
 sender=io('http://127.0.0.1:5000',{auth:{token:tokens[0]},autoConnect:false});receiver=io('http://127.0.0.1:5000',{auth:{token:tokens[1]},autoConnect:false});
 const connected=s=>new Promise((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);s.connect()});await Promise.all([connected(sender),connected(receiver)]);
 const content='Teste automatizado temporário';const incoming=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Mensagem não recebida')),5000);receiver.once('receive_message',m=>{clearTimeout(t);resolve(m)});});sender.emit('send_message',{receiverId:ids[1],content});const msg=await incoming;assert.equal(msg.content,content);
 for(let i=0;i<2;i++){const r=await fetch('http://127.0.0.1:5000/api/chat/'+ids[1-i],{headers:{Authorization:'Bearer '+tokens[i]}});assert.equal(r.status,200);const history=await r.json();assert.equal(history.length,1);assert.equal(history[0].id,msg.id);}
 }finally{sender?.disconnect();receiver?.disconnect();await prisma.message.deleteMany({where:{senderId:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();}
});
