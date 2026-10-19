# Rebobine Vídeo Locadora

Sistema completo de videolocadora: **backend em Node.js + Express + SQLite** e **frontend em HTML, CSS e
JavaScript puro**, com visual retrô de balcão de locadora.

## O que o sistema faz

- **Filmes (CRUD):** título, ano, classificação, total de cópias e **vários gêneros por filme**.
- **Acervo já preenchido:** 25 filmes, 3 clientes e 3 locações de exemplo (uma em dia, uma atrasada, uma devolvida).
- **Busca** por título, gênero ou ano (ignora acentos), filtro por gênero e "só disponíveis".
- **Exemplares disponíveis:** cada filme mostra "X de Y disponíveis"; o cabeçalho mostra o total geral.
- **Alugar:** preenche os dados do cliente (CPF, nome, telefone, e-mail). Se o CPF já existe, os dados são
  carregados sozinhos; se for novo, o cliente é cadastrado junto com a locação.
- **Devolver:** botão na tela de Locações; o estoque volta na hora e um recibo mostra a multa, se houver.
- **Multa:** prazo de **7 dias**; a partir do 8º dia cobra **R$ 2,00 por dia** de atraso
  (valor em `MULTA_DIA` no `.env`). Cliente com filme atrasado não consegue alugar outro.
- **Clientes (CRUD)** com validação de CPF e telefone.
- **Login** para o balcão (as rotas de clientes, locações e de alterar o acervo exigem token).
- **Testes automatizados** da API e das regras de multa.

## Banco de dados

SQLite, arquivo `backend/locadora.sqlite`, criado e populado automaticamente na primeira execução.
O gênero fica numa tabela própria ligada ao filme por uma tabela N:N.

```
generos (id, nome)                      clientes (id, nome, cpf, telefone, email)
filmes (id, titulo, ano, classificacao, copias)
filme_generos (filme_id, genero_id)     locacoes (id, cliente_id, filme_id, data_retirada,
                                                  data_prevista, data_devolucao, multa)
```

Exemplares disponíveis = `copias` menos as locações sem `data_devolucao`. Para recomeçar do zero, apague
`backend/locadora.sqlite` e inicie o servidor de novo.

## Como rodar

Requisito: **Node.js 22.13 ou superior** (usa o SQLite embutido do Node, então não precisa compilar nada).

```bash
cd backend
npm install
npm start
```

Abra **http://localhost:3000** e entre com **admin / locadora123**.
Para trocar usuário, senha, porta ou valor da multa: copie `backend/.env.example` para `backend/.env`.

```bash
npm test      # roda os testes
npm run dev   # reinicia sozinho ao salvar
```

## Estrutura

```
backend/
├── server.js                      # inicia o servidor
├── src/
│   ├── app.js                     # Express, middlewares, rotas e tratamento de erros
│   ├── config/  env.js database.js seed.js
│   ├── middlewares/auth.js        # token JWT (HS256) com o módulo crypto
│   ├── routes/                    # filmes, generos, clientes, locacoes, auth
│   ├── controllers/               # status HTTP e resposta
│   ├── models/                    # validação, regras e SQL (inclui multa e estoque)
│   └── util/                      # datas, CPF, busca sem acento, erros
└── tests/  api.test.js seed.test.js
frontend/
├── index.html
├── css/styles.css                 # tema retrô (paleta vinho, bege, creme e rosa)
└── js/  util.js api.js filmes.js clientes.js locacoes.js app.js
```

## Endpoints

Consulta de filmes e gêneros é pública. O resto exige o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/login` | `{ usuario, senha }` devolve `{ token }` |
| GET | `/api/filmes?busca=&genero=&disponiveis=1` | lista com `generos[]` e `disponiveis` |
| GET/POST/PUT/DELETE | `/api/filmes[/:id]` | CRUD (POST/PUT: `{ titulo, ano, classificacao, copias, generos: [] }`) |
| GET | `/api/generos` | gêneros e quantidade de filmes |
| GET/POST/PUT/DELETE | `/api/clientes[/:id]` | CRUD de clientes |
| GET | `/api/clientes/cpf/:cpf` | busca cliente por CPF |
| GET | `/api/locacoes?status=abertas`, `atrasadas`, `devolvidas` ou `todas` (e `&busca=`) | lista com dias de atraso e multa |
| POST | `/api/locacoes` | `{ filme_id, cliente: { nome, cpf, telefone, email } }` ou `{ filme_id, cliente_id }` |
| POST | `/api/locacoes/:id/devolucao` | registra a devolução e fecha a multa |

Erros seguem o formato `{ "erro": "mensagem" }` (400 validação, 401 sem login, 404, 409 regra de negócio).

**Regras de integridade:** não se exclui filme ou cliente que já tenha locação registrada (para tirar um
filme de circulação, zere as cópias); não se reduz o total de cópias abaixo do que está alugado.

## Equipe

- Laura Radünz Pedro
- Julia Miranda Lima
- Emanuella Bedim Zaniolo
