import { Button } from "@/components/shared/ui/button";

function App() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h1 className="font-display text-4xl font-bold">Preto ou Branco</h1>
      <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black">
        Jogar
      </Button>
    </div>
  );
}

export default App;
