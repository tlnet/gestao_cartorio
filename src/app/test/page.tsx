export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-blue-600">🎉 Sistema Funcionando!</h1>
      <p className="mt-4 text-lg">Se você está vendo esta página, o Next.js está rodando corretamente.</p>
      <div className="mt-8 space-y-2">
        <p>✅ Next.js carregado</p>
        <p>✅ Tailwind CSS funcionando</p>
        <p>✅ Roteamento ativo</p>
      </div>
      <div className="mt-8">
        <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Voltar para Home
        </a>
      </div>
    </div>
  );
}