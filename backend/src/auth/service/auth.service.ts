import { Injectable } from '@nestjs/common';
import { LoginDTO } from '../dtos/LoginDTO';
import { CadastroDTO } from '../dtos/CadastroDTO';

@Injectable()
export class AuthService {

    async cadastro(data : CadastroDTO){
        
        return 'cadastro';
    }

    async login(data : LoginDTO){
        return 'login';
    }
}
