import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, User } from "lucide-react";

const Marketplace = () => {
  const products = [
    { name: "Maize", price: "E10/bag", seller: "Helen Dlamini" },
    { name: "Cassava", price: "E8/bag", seller: "John Mnisi" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search for products" className="pl-10" />
        </div>
        
        <div>
          <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Browse Products</h4>
          <div className="space-y-3">
            {products.map((product, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-accent/50 border border-border">
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.price}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{product.seller}</p>
                  </div>
                </div>
                <Button variant="default" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-earth-light/20 p-3 rounded-lg border border-earth/20">
          <p className="text-sm font-medium mb-1">Quality maize for sale</p>
          <p className="text-xs text-muted-foreground">We have plenty of quality maize for sale</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Marketplace;
