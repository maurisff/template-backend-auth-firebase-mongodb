# template-backend-auth-firebase-mongodb

> Projeto de modelo para autenticação de usuarios com Firebase Auth e banco de dados NoSQL MongoDB, utilizando as tecnologias Node.JS, Express.JS e MongoDB.

## Build Setup

### Create an .env File
#### For Windows with cmd
```bash
copy NUL .env 
```
#### For Windows with PowerShell
```bash
New-Item .env -ItemType File
```
#### For Linux/Unix
```bash
touch .env 
```

### Add the environment variables needed to boot the server into the .env file:
```bash
API_PORT=4000
MONGO_DB=mongodb://localhost:27017/db-api
HTTPLOG=false
TZSERVER=America/Sao_Paulo
FIREBASE_JSON_CONFIG={"type":"service_account","project_id":"YOUR PROJECT ID","private_key_id":"YOUR PRIVATE KEY ID","private_key":"YOUR PRIVATE KEY","client_email":"YOUR PROJECT CLIENT EMAIL","client_id":"YOUR PROJECT CLIENT ID","auth_uri":"YOUR PROJECT AUTH URI","token_uri":"YOUR PROJECT TOKEN AUTH URI","auth_provider_x509_cert_url":"YOUR PROJECT AUTH PROVIDER X509 CERT URL","client_x509_cert_url":"YOUR PROJECT CLIENT PROVIDER X509 CERT URL"}
```
** NOTE: See that the FIREBASE_JSON_CONFIG variable is a JSON object minified with the private keys of your Firebase project
### install dependencies
npm install

# serve with hot reload at localhost:4000
npm run dev

# build for production with minification
npm run start
