# Evolução — peso e hábitos (versão 3)

Aplicativo web instalável (PWA), estático, sem dependências externas e inteiramente em português do Brasil.

## O que mudou nesta versão

- **Peso e circunferência independentes.** O botão de confirmação da tela inicial salva somente as medidas com as quais você interagiu desde a última confirmação. O outro número continua visível, mas não é registrado novamente. Uma medição de peso em um dia não cria medição abdominal fictícia no mesmo dia.
- **Barra abdominal mais precisa.** O controle exibe um intervalo de aproximadamente 10 cm ao redor da última medida, com incrementos de **0,5 cm**. Ao tocar no número, também é possível digitá-lo. Medidas antigas com outros decimais são preservadas até serem alteradas.
- **Gráfico com escala temporal correta.** Os pontos são posicionados conforme a distância real entre suas datas de medição, não com espaçamento uniforme.
- **Tendência de peso.** Uma média móvel das medições disponíveis nos 7 dias anteriores aparece quando há pelo menos 3 medições na janela e pontos suficientes para traçar uma linha. Não são inventados valores para dias sem registro.
- **Quadro de hábitos.** No histórico há um panorama de alimentação e treino dos últimos 14 dias. Cinza significa **sem registro**, não “dia ruim” ou “treino não realizado”. O quadro permite comparar os hábitos com a evolução, sem inferir causalidade automaticamente.
- **Meta opcional.** É possível configurar uma meta de peso na área de dados e backup. A meta aparece como linha discreta no gráfico se estiver na escala visível ou como referência abaixo do gráfico se estiver fora dela.
- **Backup e atualizações.** O backup JSON inclui a meta de peso. Um lembrete aparece na área de configurações após pelo menos sete dias desde o primeiro registro, cinco registros e sete dias sem exportação. O cache do PWA foi renovado.

## Como usar

1. Na tela inicial, gire o círculo para alterar o peso em passos de **0,1 kg**, ou toque no número para digitá-lo.
2. Arraste a barra abdominal em passos de **0,5 cm**, ou toque no número para digitá-lo. A barra fica concentrada em torno do valor atual para facilitar a precisão.
3. Toque no ícone discreto **✓✓** para confirmar. **Somente as medidas alteradas ou explicitamente digitadas** entram no registro de hoje. Se você mediu o mesmo valor de ontem, toque no número, confirme-o e depois use ✓✓.
4. Os ícones ✓ e × abrem registros de alimentação dentro e fora do planejado. O ícone de halter abre um registro de treino. Todos permitem observação opcional.
5. O histórico fica no ícone de gráfico no canto superior direito; lá também é possível editar ou excluir registros anteriores, ver gráficos, filtrar registros e comparar hábitos.
6. A área de configurações (engrenagem no histórico) permite definir uma meta e fazer backup JSON.

**Importante:** os números `90,0` e `98,0` vistos antes do primeiro registro são apenas valores iniciais para ajuste, **não** medições registradas.

## Compatibilidade com registros existentes

A versão 3 mantém a chave de armazenamento **`evolucao-pessoal-v1`**. Os dados do aplicativo anterior continuam acessíveis, sem criar automaticamente medições novas. Ao salvar um registro novo, os dados passam para o formato de backup 2, que admite peso e circunferência em datas separadas. Backups antigos com `schemaVersion: 1` continuam podendo ser importados.

Nos registros anteriores à versão 3, peso e circunferência eram confirmados conjuntamente. **Não há como saber retroativamente** se ambas as medidas foram realmente feitas na data: os valores históricos são preservados exatamente como estavam, sem reinterpretá-los.

**Recomendação ao atualizar:** antes de alterar os arquivos no GitHub, abra o aplicativo antigo e exporte um backup JSON. Atualizar os arquivos no mesmo endereço não deve apagar o armazenamento local. Ainda assim, um backup é importante porque o iPhone pode limpar dados de sites ou armazenar os dados da versão instalada separadamente do Safari.

## Publicar no GitHub Pages

1. Extraia o ZIP.
2. Envie **todos os arquivos de dentro de `peso-app/`** para a raiz do mesmo repositório GitHub. Preserve a pasta `assets/` e substitua os arquivos antigos com mesmo nome.
3. Em **Settings → Pages**, selecione **Deploy from a branch**, `main` e `/ (root)`.
4. Depois que a publicação estiver disponível, abra o mesmo endereço no Safari e atualize a página. Não é necessário criar outro repositório ou mudar a URL.
5. Para instalação inicial: no Safari, use **Compartilhar → Adicionar à Tela de Início**.

O aplicativo é compatível com o endereço relativo de um projeto GitHub Pages, como `https://usuario.github.io/repositorio/`.

### Ícone e atualização offline

Os arquivos de ícone ficam em `assets/` e na raiz (`apple-touch-icon.png`, `apple-touch-icon-v2.png`). Se o iPhone continuar exibindo uma letra no ícone, confira a publicação de todos os arquivos e recrie o atalho **após exportar um backup**.

`sw.js` usa uma nova versão de cache. HTML, JavaScript e CSS priorizam a versão publicada quando existe conexão e usam a cópia local quando offline. Depois de substituir os arquivos no GitHub, pode ser necessário fechar e reabrir o aplicativo para carregar a atualização completa.

## Estrutura

```text
peso-app/
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.webmanifest
├── favicon.ico
├── apple-touch-icon.png
├── apple-touch-icon-v2.png
├── assets/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md
```

## Dados, privacidade e backup

- Dados guardados localmente no `localStorage`, **não** no GitHub nem em servidor externo.
- Peso entre 35 e 250 kg; circunferência entre 50 e 160 cm.
- Um registro de medidas por dia, com um ou ambos os campos; os valores ausentes não são substituídos por zeros.
- Um registro alimentar por dia. São permitidos vários registros de treino no mesmo dia.
- O histórico usa somente valores explicitamente registrados; a ausência de registro não é interpretada como descumprimento.
- Backups novos têm `{ "app": "evolucao", "schemaVersion": 2, "settings": { "weightGoal": null }, "records": [] }` como estrutura básica, com os registros dentro do array.
- Importar um backup **substitui** os registros atuais após confirmação. Backups anteriores, com schema 1, ainda são aceitos; a meta atual é mantida se o backup antigo não contiver meta.
- A meta é armazenada separadamente na chave `evolucao-pessoal-config-v1` e incluída nos backups da versão 3.
- Limpar dados do Safari, desinstalar ou trocar de aparelho pode fazer os registros desaparecerem. Exporte o JSON periodicamente.

## Teste local

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`. O PWA exige HTTPS ou localhost para o funcionamento offline.
