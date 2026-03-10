import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CadastroDTO } from '../dtos/CadastroDTO';
import { LoginDTO } from '../dtos/LoginDTO';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class AuthService {
    constructor(private prismaService: PrismaService){}

    async cadastro(data : CadastroDTO){

        const usuarioExistente = await this.prismaService.usuario.findUnique({
            where: {
                email: data.email
            }
        });

        if(usuarioExistente){
            throw new UnauthorizedException('Usuário já existente');
        }

        const usuario = await this.prismaService.usuario.create({ data })

        return {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome
        };
    }

    async login(data : LoginDTO){
        console.log(data)

        return "Login";
    }



}
