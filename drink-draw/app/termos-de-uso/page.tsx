export const metadata = { title: "Termos de uso | Drink Draw" };

export default function TermsPage() {
  return (
    <main className="frame dashboard">
      <header className="page-intro">
        <h1>Termos de uso<span>.</span></h1>
        <p>O Drink Draw ajuda você a comparar preços de bebidas e localizar estabelecimentos cadastrados.</p>
      </header>
      <div className="terms-content">
        <section>
          <h2>Preços e disponibilidade</h2>
          <p>Os valores exibidos são aproximados e podem mudar sem aviso prévio. Preços de referência, promoções e disponibilidade podem variar por unidade, data e canal de venda. Confirme o preço e o estoque com o estabelecimento antes de comprar. As compras são feitas diretamente com o estabelecimento.</p>
        </section>
        <section>
          <h2>Como o comparador calcula os valores</h2>
          <p>O preço total corresponde à quantidade multiplicada pelo preço unitário. O preço por litro considera o valor e o volume informados. Confira a embalagem, o volume e a quantidade de cada oferta antes de comparar.</p>
        </section>
        <section>
          <h2>Informações do mapa</h2>
          <p>O mapa exibe estabelecimentos cadastrados com coordenadas. Quando você escolhe usar sua localização e autoriza o acesso no navegador, os locais são ordenados pela distância em linha reta. Confirme o endereço e o horário de funcionamento com o estabelecimento antes de sair.</p>
        </section>
      </div>
    </main>
  );
}
