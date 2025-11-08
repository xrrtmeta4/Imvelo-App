import MarketplaceFeed from '@/components/MarketplaceFeed';

const Marketplace = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Imakethe</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6">
        <MarketplaceFeed />
      </div>
    </div>
  );
};

export default Marketplace;
