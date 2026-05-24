# Guia de Backup, Controle de Versão e Recuperação - Corellux OS

Agora que o Corellux OS está integrado ao **Git**, **GitHub** e **Vercel**, você está **100% protegido** contra qualquer alteração que quebre o sistema. Nunca mais ocorrerá o problema de fazer uma alteração e não conseguir arrumar!

Este guia prático ensina como salvar o progresso seguro, desfazer erros em segundos e testar novas ideias sem risco.

---

## 1. O Conceito Principal: O Commit é o seu "Ponto de Restauração"

No desenvolvimento moderno, você nunca trabalha editando arquivos sem rede de segurança. 
Pense no Git como um jogo: sempre que você passa de uma fase difícil (uma funcionalidade que está funcionando 100%), você faz um **Commit** (salva o jogo). Se você "morrer" na próxima fase (o código quebrar), você simplesmente recarrega o último save.

---

## 2. Como Salvar seu Trabalho (Criar um Ponto de Restauração)

Sempre que terminarmos uma funcionalidade (ex: "Logística está funcionando") e você quiser salvar esse estado seguro:

Abra o terminal na pasta `c:\Users\LENOVO\Desktop\aplicacao` e digite:

```powershell
# 1. Verifica quais arquivos foram alterados
git status

# 2. Prepara todos os arquivos alterados para o salvamento
git add .

# 3. Cria o ponto de salvamento com uma mensagem clara
git commit -m "feat: modulo de logistica funcionando perfeitamente"

# 4. Envia esse ponto de salvamento para a nuvem (GitHub)
git push
```
> **Dica Vercel**: No momento em que você der o `git push`, a Vercel vai detectar automaticamente e atualizar o site online. Se o build passar, o site atualiza. Se o build falhar (porque o código está quebrado), a Vercel **mantém o site antigo no ar** para que seus usuários não vejam o sistema quebrado!

---

## 3. O Código Quebrou! Como Desfazer e Voltar ao Estado Seguro?

Se você mexeu no código, a tela ficou branca ou cheia de erros, e você não sabe como consertar, você tem dois níveis de "desfazer":

### Caso A: Você ainda NÃO fez um commit das alterações quebradas (Mais Comum)
Você quer apenas descartar tudo o que escreveu desde o último salvamento e voltar para quando o código estava funcionando:

```powershell
# Descarta TODAS as alterações não salvas nos arquivos e volta ao último commit seguro instantaneamente
git restore .
```
*Pronto! Seus arquivos voltam a ser exatamente o que eram no último commit seguro. Sem estresse.*

### Caso B: Você quer ver o que mudou antes de apagar
Se você quer ver quais linhas você adicionou ou removeu que podem ter causado o erro:

```powershell
git diff
```
*(Para sair da tela do `git diff`, basta pressionar a tecla `q` no teclado).*

### Caso C: Você já fez commit do código quebrado e quer voltar no tempo
Se você salvou o código quebrado no Git e quer reverter para um commit anterior:

1. Digite `git log --oneline` para ver a lista de salvamentos anteriores. Exemplo:
   ```text
   a1b2c3d (HEAD -> main) commit quebrado que fiz agora
   e8b4666 feat: initial commit of Corellux OS ERP in React (Funcionando!)
   ```
2. Para voltar temporariamente ao commit que funcionava:
   ```powershell
   git checkout e8b4666
   ```
3. Para apagar o commit quebrado de vez e voltar para o funcionando permanentemente:
   ```powershell
   git reset --hard e8b4666
   ```
   *(Substitua `e8b4666` pelo código do seu commit que estava funcionando).*

---

## 4. Como Testar Ideias Sem Risco: Usando Branches (Ramificações)

Se você quer testar uma alteração grande ou deixar um programador testar algo sem mexer no sistema que está online no restaurante:

```powershell
# 1. Cria e entra em uma cópia segura chamada 'teste-layout'
git checkout -b teste-layout

# 2. Pode quebrar, mexer e alterar o que quiser aqui. O site principal ('main') não será afetado.

# 3. Se o teste der errado:
git checkout main         # Volta para o código seguro oficial
git branch -D teste-layout # Deleta a cópia quebrada de teste

# 4. Se o teste der certo e você quiser colocar no sistema oficial:
git checkout main
git merge teste-layout    # Junta as alterações no código oficial
git push                  # Envia para o ar
```

---

## 5. A Rede de Segurança Suprema da Vercel

Mesmo se você cometer o erro de dar `git push` em um código quebrado e ele for para o GitHub, a Vercel tem um histórico de **Deployments** (Hospedagens):
1. Acesse o painel da Vercel.
2. Clique no seu projeto `corelluxos`.
3. Vá na aba **Deployments**.
4. Você verá uma lista de todas as vezes que o código foi atualizado.
5. Clique nos três pontinhos (`...`) ao lado do penúltimo deploy (o que estava funcionando) e selecione **Instant Rollback**.
6. O site volta a rodar a versão antiga funcionando na hora, enquanto você conserta o erro no seu computador com calma!
