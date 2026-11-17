require('dotenv').config();
const test=require('node:test'),assert=require('node:assert/strict'),bcrypt=require('bcryptjs'),prisma=require('../src/config/prisma');
const controller=require('../src/controllers/authController');
const reply=()=>({code:200,status(n){this.code=n;return this},json(data){this.body=data;return this}});
test('recuperação gera token temporário, troca senha e impede reutilização',async()=>{
 const id=require('crypto').randomUUID();const oldMode=process.env.NODE_ENV;process.env.NODE_ENV='test';
 const mailKeys=['SMTP_HOST','SMTP_USER','SMTP_PASS'];const saved=mailKeys.map(k=>process.env[k]);mailKeys.forEach(k=>delete process.env[k]);
 try{
 const u=await prisma.user.create({data:{id,name:'Teste recuperação temporário',email:id+'@example.invalid',cpf:id,password:await bcrypt.hash('old-test-password',10)}});
 const r=reply();await controller.forgotPassword({body:{email:u.email}},r);assert.equal(r.code,200);
 const stored=await prisma.user.findUnique({where:{id}});assert.ok(stored.resetToken);assert.ok(stored.resetTokenExpiry>new Date());
 const reset=reply();await controller.resetPassword({body:{token:stored.resetToken,newPassword:'new-test-password'}},reset);assert.equal(reset.code,200);
 const changed=await prisma.user.findUnique({where:{id}});assert.ok(await bcrypt.compare('new-test-password',changed.password));assert.equal(changed.resetToken,null);
 const reused=reply();await controller.resetPassword({body:{token:stored.resetToken,newPassword:'other-test-password'}},reused);assert.equal(reused.code,400);
 }finally{await prisma.user.deleteMany({where:{id}});process.env.NODE_ENV=oldMode;mailKeys.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]);await prisma.$disconnect();}
});
