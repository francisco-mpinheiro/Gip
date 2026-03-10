import { Body, Controller, Post } from '@nestjs/common';
import type { CadastroDTO } from '../dtos/CadastroDTO';
import type { LoginDTO } from '../dtos/LoginDTO';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){}
    // Cadastro
    @Post("cadastro")
    async cadastro(@Body() body : CadastroDTO){
        await this.authService.cadastro(body);
    }

    // Login
    @Post('login')
    async login(@Body() body : LoginDTO){
        await this.authService.login(body);

        return body;
    }
}
