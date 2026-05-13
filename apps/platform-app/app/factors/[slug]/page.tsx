interface FactorPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FactorPage({ params }: FactorPageProps) {
  const { slug } = await params;
  return (
    <main>
      <h1>Factor: {slug}</h1>
      <p>Factor portal placeholder — full portal coming in a follow-up cycle.</p>
    </main>
  );
}
