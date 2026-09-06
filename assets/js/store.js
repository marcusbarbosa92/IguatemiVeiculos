/* Dados institucionais da loja (fonte: iguatemiautomoveis.com.br + Receita Federal via BrasilAPI, conferidos em 06/09/2026).
   Este arquivo é a única fonte destes dados no site: cabeçalho, rodapé, páginas e mensagens de WhatsApp leem daqui. */
window.STORE = {
  nome: "Iguatemi Automóveis",
  razaoSocial: "Iguatemi Automoveis Intermediacao de Veiculos Ltda",
  cnpj: "25.189.123/0001-43",
  slogan: "O melhor preço, com a qualidade e procedência que você merece.",
  descricao: "Compre seu veículo de forma rápida e segura, com qualidade, procedência e atendimento especializado na Iguatemi Automóveis, em Campinas.",
  sobre: [
    "Contamos com uma década de história, com um estoque amplo e nossas plataformas atualizadas diariamente.",
    "Todos os nossos carros são vistoriados e com laudo cautelar aprovado sem restrições ou observações. Nossos veículos são de qualidade e procedência, compostos pelas principais marcas do mercado: Mercedes-Benz, BMW, Audi, Jeep, Volvo, Honda, Volkswagen, Chevrolet, Mitsubishi, Fiat, Toyota, Hyundai, Land Rover, Ford, Citroën, Jaguar e outras, sempre buscando oferecer uma grande variedade de carros para a escolha de nossos clientes.",
    "Realizamos avaliação dos carros na hora e temos os preços mais competitivos do mercado. Venha conhecer a nossa loja e o nosso estoque!"
  ],
  telefone: { exibicao: "(19) 3326-8747", e164: "+551933268747" },
  whatsapp: { exibicao: "(19) 99995-0000", numero: "5519999950000", mensagemPadrao: "Olá, vim pelo site e gostaria de saber mais sobre um carro" },
  email: "vendas@iguatemiautomoveis.com.br",
  endereco: {
    logradouro: "Av. José Bonifácio", numero: "1580", bairro: "Jardim das Paineiras",
    cidade: "Campinas", uf: "SP", cep: "13091-140", lat: -22.8917336, lng: -47.0342262
  },
  horario: [
    { dias: "Segunda a Sexta", horas: "8h às 18h", abre: "08:00", fecha: "18:00", diasSemana: [1, 2, 3, 4, 5] },
    { dias: "Sábado", horas: "9h às 13h", abre: "09:00", fecha: "13:00", diasSemana: [6] }
  ],
  links: {
    siteAtual: "https://iguatemiautomoveis.com.br/",
    instagram: "https://www.instagram.com/iguatemiautomoveis/",
    instagramDirect: "https://ig.me/m/iguatemiautomoveis", // link oficial da Meta para abrir uma conversa no Direct (mesmo @ do perfil)
    facebook: "https://www.facebook.com/iguatemiautomoveis/",
    tiktok: "https://www.tiktok.com/@iguatemi.automoveis",
    youtube: "https://www.youtube.com/@IguatemiAutomoveis",
    googleMaps: "https://www.google.com/maps?ll=-22.891734,-47.034226&z=16&t=m&hl=pt-BR&gl=BR&q=Av.+Jos%C3%A9+Bonif%C3%A1cio,+1580+-+Jardim+das+Paineiras+Campinas+-+SP+13091-140",
    waze: "https://www.waze.com/live-map/directions/br/sp/av.-jose-bonifacio,-1580?navigate=yes&to=place.ChIJNVn3rGjPyJQRfmrRZx9g3vE",
    mapaEmbed: "https://maps.google.com/maps?q=-22.8917336,-47.0342262&z=15&output=embed"
  },
  vendaSeuVeiculo: "Temos a solução completa para você vender seu veículo ganhando mais. Garantimos um pagamento 100% seguro e disponibilizamos um consultor especialista que cuidará da sua venda do início ao fim.",
  garantias: [
    { titulo: "Procedência comprovada", texto: "Não trabalhamos com veículos de leilão ou seguradora." },
    { titulo: "Laudo cautelar 100% aprovado", texto: "Todos os veículos possuem laudo cautelar aprovado, sem restrições ou apontamentos." },
    { titulo: "Avaliação do seu carro na hora", texto: "Realizamos a avaliação dos carros na hora, com os preços mais competitivos do mercado." },
    { titulo: "Pagamento seguro", texto: "Pagamentos exclusivamente no CNPJ da Iguatemi Automóveis, garantindo total segurança na negociação." }
  ],
  avisoLegal: "Reservamo-nos o direito de corrigir eventuais erros de digitação, valores e opcionais dos veículos, sem aviso prévio.",
  // Medição: os mesmos IDs que o site atual usa (extraídos do HTML de iguatemiautomoveis.com.br). Deixe null para desligar.
  analytics: { ga4: "G-F35L06L32H", metaPixel: "410840736561439" }
};
