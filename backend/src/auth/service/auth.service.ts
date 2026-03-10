import { Injectable } from '@nestjs/common';
import { CadastroDTO } from '../dtos/CadastroDTO';
import { LoginDTO } from '../dtos/LoginDTO';

@Injectable()
export class AuthService {

    async cadastro(data : CadastroDTO){
        
        console.log(data)

        return 'cadastro';
    }

    async login(data : LoginDTO){
        console.log(data)

        return "Login";
    }



}
