"use client";

import { useState } from "react";
import { ArrowRight, Check, Heart, Ruler, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageViewer from "@/components/menu-item/image-viewer-basic";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MenuItemDetailsProps {
  id: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  inStock?: boolean;
  stockCount?: number;
  price?: number;
  prefix?: string;
  category?: string;
  sizes?: string[];
  colors?: string[];
}

function MenuItemDetails({
  id,
  description,
  imageUrl,
  inStock,
  prefix = "$",
  price = 0,
  title = "Prenda",
  category = "Colección",
  sizes = [],
  colors = [],
  stockCount = 0,
}: MenuItemDetailsProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [isFavorite, setIsFavorite] = useState(false);

  const handleAdd = (goToCheckout = false) => {
    if (!inStock) return;
    if (sizes.length && !selectedSize) {
      toast.error("Elige una talla para continuar");
      return;
    }
    if (colors.length && !selectedColor) {
      toast.error("Elige un color para continuar");
      return;
    }

    addItem({
      id,
      title,
      description,
      imageUrl: imageUrl ?? "",
      prefix,
      price,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    toast.success(`${title} se añadió a tu bolsa`);
    if (goToCheckout) router.push("/checkout");
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
      <div className="text-muted-foreground mb-8 flex items-center gap-3 text-sm">
        <button onClick={() => router.back()} className="hover:text-foreground">
          Colección
        </button>
        <span>/</span>
        <span>{category}</span>
        <span>/</span>
        <span className="text-foreground">{title}</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-14">
        <div className="relative">
          <div className="border-primary/40 absolute -top-5 -left-5 hidden h-24 w-24 rounded-full border border-dashed lg:block" />
          <div className="bg-secondary relative overflow-hidden rounded-[2rem] p-3 sm:p-5">
            <div className="stitch-border overflow-hidden rounded-[1.5rem] bg-[#d8c6b5]">
              <ImageViewer
                imageUrl={imageUrl ?? ""}
                imageTitle={title}
                classNameThumbnailViewer="aspect-[4/5] w-full object-cover"
                className="w-full"
              />
            </div>
          </div>
          <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs tracking-[0.16em] uppercase">
            <span className="thread-line flex-1" />
            Hecho con calma
            <span className="thread-line flex-1" />
          </div>
        </div>

        <Card className="border-primary/15 bg-card/85 rounded-[1.75rem] shadow-none">
          <CardContent className="p-6 sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div>
                <Badge
                  variant="outline"
                  className="border-primary/25 text-primary mb-4 rounded-full"
                >
                  {category}
                </Badge>
                <h1 className="font-display text-primary text-5xl leading-[0.9] font-semibold tracking-tight sm:text-6xl">
                  {title}
                </h1>
              </div>
              <button
                onClick={() => setIsFavorite((value) => !value)}
                className="border-border hover:bg-secondary rounded-full border p-3 transition"
                aria-label="Guardar producto"
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    isFavorite && "fill-primary text-primary",
                  )}
                />
              </button>
            </div>
            <p className="text-muted-foreground mt-6 text-base leading-7">
              {description ??
                "Una pieza especial, pensada para acompañarte durante mucho tiempo."}
            </p>
            <div className="mt-7 flex items-end justify-between">
              <p className="font-display text-primary text-4xl font-semibold">
                {prefix}
                {price.toLocaleString("es-CO")}
              </p>
              <span
                className={cn(
                  "text-sm",
                  inStock ? "text-emerald-700" : "text-destructive",
                )}
              >
                {inStock ? `${stockCount} disponibles` : "Agotado"}
              </span>
            </div>
            <Separator className="my-7" />

            {sizes.length > 0 && (
              <div className="mb-7">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Talla</p>
                  <button className="text-muted-foreground flex items-center gap-1 text-xs underline underline-offset-4">
                    <Ruler className="h-3.5 w-3.5" /> Guía de tallas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "h-11 min-w-12 rounded-xl border px-4 text-sm transition",
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div className="mb-7">
                <p className="mb-3 text-sm font-semibold">
                  Color{" "}
                  <span className="text-muted-foreground font-normal">
                    · {selectedColor}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition",
                        selectedColor === color
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary",
                      )}
                    >
                      {selectedColor === color && (
                        <Check className="mr-1 inline h-3.5 w-3.5" />
                      )}
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-secondary h-12 rounded-full"
                onClick={() => handleAdd()}
                disabled={!inStock}
              >
                Añadir a la bolsa
              </Button>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full"
                onClick={() => handleAdd(true)}
                disabled={!inStock}
              >
                Comprar ahora <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="border-border text-muted-foreground mt-7 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Truck className="text-primary h-4 w-4" /> Envíos a todo el país
              </p>
              <p className="flex items-center gap-2">
                <Check className="text-primary h-4 w-4" /> Compra segura
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export { MenuItemDetails };
export type { MenuItemDetailsProps };
