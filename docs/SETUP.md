# ContractFlow — Guia de Setup (troca de PC / instalação local)

Este guia mostra o passo a passo para rodar o projeto em outro computador.
Na prática, ao trocar de PC você mexe em apenas **3 pontos**:

1. `api/.env` → senha/porta do MySQL local
2. `mobile/src/services/api.js` → IP novo da máquina
3. Recriar o banco (`schema.sql`) e rodar `npm install` em `api` e `mobile`

---

## 1. Ferramentas necessárias

- **Node.js 18+** (com npm)
- **MySQL 8+** rodando como serviço local (no Windows: serviço `MySQL80`)
- **Git** — clonar o repositório:
  ```bash
  git clone https://github.com/GuiBazon/contractflow.git
  ```
- **Expo Go** no celular (ou Android Studio/emulador, se preferir)

---

## 2. Banco de dados

Na primeira vez (e sempre que recriar o banco):

```bash
cd api
mysql -u root -p < database/schema.sql
mysql -u root -p contractflow < database/seed.sql
```

- `schema.sql` cria o banco `contractflow` com as 9 tabelas
  (clientes, contratos, despesas, documentos, extracao_ocr, historico_contratos,
  pagamentos, parcelas, usuarios).
- `seed.sql` é **opcional** — cria dados de demonstração.
  - Login demo: **`demo@contractflow.com` / `demo123`** (perfil ADMIN)

> Atenção: em cada PC a senha do `root` do MySQL pode ser diferente.
> Use a senha local da máquina; é isso que vai para o `.env` (passo 3).

---

## 3. Configurar a API (`api/.env`)

Arquivo de exemplo (valores que MUDAM de PC para PC estão marcados):

```env
PORT=3000                  # mantém
DB_HOST=127.0.0.1          # mantém
DB_PORT=3306               # padrão do MySQL80 — se o seu mudar, altere
DB_USER=root               # normalmente mantém
DB_PASSWORD=senai@604      # *** TROQUE pela senha do MySQL do PC novo ***
DB_NAME=contractflow       # mantém (recriado pelo schema.sql)
JWT_SECRET=segredo-local-de-desenvolvimento-contractflow
CORS_ORIGINS=
UPLOAD_DIR=uploads
```

---

## 4. IP da máquina — o passo que mais esquece

O celular acessa a API pelo **IP do PC na rede Wi-Fi**.

1. Descubra o IP novo: no terminal rode `ipconfig` e procure a placa Wi-Fi.
2. Edite **`mobile/src/services/api.js`** (linha 4) e troque a URL:

   ```js
   const API_URL = 'http://NOVO_IP:3000/api';
   ```

3. Confirme que:
   - PC e celular estão na **mesma rede Wi-Fi**;
   - o **firewall** libera a porta `3000`.

---

## 5. Instalar dependências (primeira vez em cada PC)

```bash
cd api && npm install
cd ../mobile && npm install
cd ../web && npm install    # apenas se for usar o front web
```

---

## 6. Rodar o projeto

```bash
# terminal 1 — API
cd api
npm run dev

# terminal 2 — mobile
cd mobile
npx expo start
```

- Abra o QR Code no Expo Go (ou pressione `a` para emulador Android).
- A API usa a porta `PORT` definida no `.env` (padrão `3000`).

---

## 7. O que NÃO muda ao trocar de PC

- `mobile/src/services/storage.js` — sessão é local do celular.
- Código dos services/controllers/routes, schema, componentes — tudo versionado no repo.
- Credenciais cadastradas — ficam no MySQL; ao rodar `seed.sql` ganha o usuário demo.

---

## Resumo (checklist rápido)

- [ ] Node.js 18+ instalado
- [ ] MySQL 8+ rodando
- [ ] `git clone` do repositório
- [ ] `schema.sql` (+ `seed.sql`) aplicados no MySQL
- [ ] `api/.env` com `DB_PASSWORD`/`DB_PORT` corretos
- [ ] `mobile/src/services/api.js` com o IP novo do PC
- [ ] `npm install` em `api` e `mobile`
- [ ] API rodando (`npm run dev` em `api`)
- [ ] Expo rodando (`npx expo start` em `mobile`)