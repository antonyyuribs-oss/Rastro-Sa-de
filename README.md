# Evolução — peso e hábitos

Aplicativo web instalável (PWA), estático, minimalista e sem dependências externas.

## O que faz

- **Início:** ajuste o peso (gire a borda do círculo, 0,1 kg por passo, ou toque no número), ajuste a circunferência (arraste a barra ou toque no número) e use o botão inferior `✓✓` para confirmar as medidas do dia.
- **Alimentação:** `✓` para dentro do planejado e `×` para fora do planejado. Ambos abrem um registro com data e observação opcional. Há um registro alimentar por dia; um novo registro da mesma data atualiza o existente.
- **Treino:** o ícone de halter abre um registro de treino, com data e observação opcional. Você pode registrar mais de um treino na mesma data.
- **Histórico:** gráfico de peso ou circunferência, visualização em 30 dias, 90 dias ou todo o período, variação, lista cronológica e filtros. Toque em um registro para editar ou excluir.
- **Backup:** na engrenagem do histórico, exporte ou importe os dados em formato JSON. A importação **substitui** os dados atuais, após confirmação.
- **Sem conta e sem servidor:** os dados ficam exclusivamente no armazenamento local do navegador, que não é compartilhado com o GitHub.
- **Funciona offline:** depois da primeira visita via HTTPS, o service worker salva os arquivos necessários.

**Atenção:** na primeira abertura, `90,0` e `98,0` são somente valores iniciais editáveis. Não representam medições já registradas; só são salvos quando o botão inferior é pressionado.

## Publicar gratuitamente no GitHub Pages

1. Crie um repositório no GitHub (ex.: `evolucao`).
2. Extraia o ZIP e envie **o conteúdo da pasta `peso-app`** para a raiz do repositório. `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest` e a pasta `assets/` precisam ficar na raiz.
3. Em **Settings → Pages**, selecione **Deploy from a branch**, escolha `main` e `/ (root)`; salve.
4. O GitHub mostrará o endereço em formato `https://USUARIO.github.io/evolucao/`. Abra esse endereço para usar o aplicativo.

Se publicar no diretório de um projeto GitHub Pages, tudo continua funcionando: as URLs são relativas, sem assumir a raiz do domínio.

## Instalar no iPhone

1. Abra o endereço publicado no **Safari**.
2. Toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
3. Abra pelo ícone **Evolução**. O aplicativo fica em tela cheia (modo standalone).

### Se aparecer apenas a letra “E” como ícone

A letra “E” é um ícone gerado automaticamente pelo iPhone quando ele não consegue utilizar a imagem do aplicativo. O símbolo verdadeiro é um círculo de medição com marca de confirmação, sobre fundo escuro.

1. Substitua **todos os arquivos**, incluindo `assets/`, na raiz do repositório GitHub (não envie apenas `index.html`). O ícone para iPhone também foi incluído na raiz como `apple-touch-icon.png` e `apple-touch-icon-v2.png`.
2. Espere o GitHub Pages terminar de publicar. Abra diretamente `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/apple-touch-icon-v2.png` para conferir se a imagem aparece.
3. Remova **somente o atalho do aplicativo** com a letra “E” da Tela de Início do iPhone. Isso não apaga seus dados do GitHub, mas os registros locais podem depender do modo de instalação: exporte um backup JSON antes de remover se você já registrou informações.
4. Acesse novamente o endereço do aplicativo **pelo Safari** (não por navegador interno), atualize a página e use Compartilhar → Adicionar à Tela de Início. O iOS pode manter o ícone de um atalho já instalado mesmo depois da atualização do site.

O ícone do aplicativo não é uma letra. O arquivo de imagem está incluído no projeto; a atualização altera suas referências e renova o cache offline.

**Importante:** GitHub Pages requer conexão na primeira visita para baixar o aplicativo. O modo offline funciona depois que os arquivos forem armazenados pelo navegador. Backups periódicos são essenciais: apagar dados do Safari, desinstalar, mudar de navegador/aparelho ou certas políticas de armazenamento do iOS podem fazer os registros desaparecerem. Dados do navegador e do app instalado podem não ser compartilhados em algumas versões do iOS; exporte/importe para migrar.

## Arquivos

```text
peso-app/
├── index.html              Interface e estrutura
├── styles.css              Estilos responsivos e tema escuro
├── app.js                  Registros, gráficos, edição, JSON e navegação
├── manifest.webmanifest    Instalação como aplicativo
├── apple-touch-icon.png    Ícone iPhone (caminho padrão)
├── apple-touch-icon-v2.png Ícone iPhone (versão atualizada)
├── favicon.ico             Ícone alternativo de navegador
├── sw.js                   Funcionamento offline
├── assets/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md
```

## Armazenamento, privacidade e manutenção

- Todos os registros são guardados no `localStorage` sob a chave `evolucao-pessoal-v1`.
- Pesos aceitos: de 35 a 250 kg; circunferências: de 50 a 160 cm. Data atual ou passada a partir de 01/01/2000.
- Os valores do histórico usam somente **medidas realmente confirmadas**, nunca dados de exemplo.
- Ao confirmar medidas novamente no mesmo dia, os valores daquele dia são atualizados.
- O backup usa o esquema `{app: "evolucao", schemaVersion: 1, records: [...]}`. Guarde o arquivo em local seguro, pois ele pode conter observações pessoais.
- Para publicar uma atualização, substitua os arquivos no repositório e altere a constante `CACHE` em `sw.js` (ex.: `evolucao-app-v2`) para renovar os recursos offline. Os registros locais não dependem desse cache.

## Rodar localmente para testar

```bash
python3 -m http.server 8000
```

Acesse `http://localhost:8000`. Abrir `index.html` diretamente pelo explorador pode não oferecer o modo offline, porque service workers exigem HTTPS ou localhost.
