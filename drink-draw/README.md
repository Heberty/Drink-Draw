# Drink Draw

Comparador de ofertas de bebidas em Next.js, TypeScript, Tailwind CSS e shadcn/ui.

## Executar localmente

Requer Node.js 20.9 ou superior, Yarn e Python 3.10 ou superior com o módulo padrão `sqlite3` disponível.

```sh
yarn install --frozen-lockfile
yarn dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Como funciona

- Use **+** para comparar até quatro ofertas. Informe o preço total, o volume por unidade e a quantidade. O comparador destaca o menor preço por litro e mostra a economia em relação à segunda melhor oferta.
- Use **Restaurar valores** para recuperar a ficha cadastrada, voltar a uma unidade e preencher o preço de referência quando houver.
- O catálogo inicial em `lib/drinks.ts` contém bebidas fictícias. Os preços e estabelecimentos iniciais são ilustrativos. Os valores das lojas e aplicativos são informados manualmente.
- Abra **Administração** para cadastrar, editar ou excluir bebidas e estabelecimentos. Os cadastros e as imagens ficam no SQLite do servidor. Para recuperar registros da versão anterior, abra o painel no mesmo navegador e endereço em que foram cadastrados e clique em **Importar cadastros do navegador**.
- Os dois cadastros aceitam imagem opcional em JPG, PNG ou WebP, até 2 MB e 1600 × 1600 px. O upload é salvo em um quadro de 512 × 512 px, preservando a proporção da imagem.
- Os preços, quantidades e correções temporárias das ofertas ficam na sessão da aba. Ao selecionar a primeira bebida, o comparador sugere um produto relacionado na segunda oferta, que continua editável. O botão no cabeçalho alterna o tema.

Para verificar os tipos, execute `yarn typecheck`. Para gerar a build de produção, execute `yarn build`.

## Acesso administrativo

Copie `.env.example` para `.env.local` e preencha `DRINK_DRAW_ADMIN_USER`, `DRINK_DRAW_ADMIN_PASSWORD` e `DRINK_DRAW_SESSION_SECRET`. Gere o segredo com `openssl rand -hex 32`. Use um usuário de até 120 caracteres e uma senha de até 256 caracteres. Reinicie o servidor e abra `/admin` para entrar. No primeiro acesso, essas credenciais criam a conta inicial de administrador no SQLite. Depois, o login usa as contas persistidas e a variável `DRINK_DRAW_SESSION_SECRET` continua necessária para assinar as sessões.

Em **Usuários**, administradores podem cadastrar contas, redefinir senhas e alterar perfis. Usuários comuns têm acesso aos cadastros do catálogo.

Em **Marcas** e **Tipos de bebida**, cadastre as opções que serão selecionadas no formulário de bebidas. As marcas e os tipos das bebidas existentes são incluídos automaticamente.

Os valores usam máscara de reais. No cadastro da bebida, o preço de referência por unidade é opcional e aparece junto ao campo de preço da oferta.

O comparador usa o preço total das unidades informadas. Para comparar seis latas de 350 mL com duas garrafas de 700 mL, informe as quantidades 6 e 2, os volumes por unidade 350 e 700 e o preço total de cada conjunto.

## Banco de dados

O arquivo SQLite é criado automaticamente na primeira consulta em `data/drink-draw.sqlite`. Use `DRINK_DRAW_DATABASE_PATH` para apontar para outro caminho local e `DRINK_DRAW_PYTHON` quando o executável do Python tiver outro nome ou caminho. Ao hospedar a aplicação, mantenha esse caminho em um volume persistente do servidor. Para copiar o banco com a aplicação em execução, use o backup do SQLite. Com a aplicação parada, copie o diretório do banco.
