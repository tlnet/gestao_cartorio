"use client";

import React, { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
  imageSrc: string;
}

const ImageCrop: React.FC<ImageCropProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  imageSrc,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 90,
          },
          1,
          width,
          height
        ),
        width,
        height
      );
      setCrop(crop);
    },
    []
  );

  const onDownloadCropClick = useCallback(() => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = imgRef.current;

    // Usar dimensões fixas para o avatar (300x300 pixels)
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calcular as coordenadas reais da imagem (considerando escala e rotação)
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // Desenhar a imagem cortada no canvas
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    // Converter para blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.9
    );
  }, [completedCrop, onCropComplete, onClose]);

  // Função para atualizar o preview do canvas
  const updatePreview = useCallback(() => {
    if (!previewCanvasRef.current || !imgRef.current || !completedCrop) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = imgRef.current;

    // Definir tamanho do canvas de preview
    const previewSize = 150;
    canvas.width = previewSize;
    canvas.height = previewSize;

    // Calcular as coordenadas reais da imagem
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // Desenhar a imagem cortada no canvas de preview
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      previewSize,
      previewSize
    );
  }, [completedCrop]);

  // Atualizar preview quando completedCrop mudar
  React.useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ajustar Foto de Perfil</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controles */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Proporção:</span>
              <select
                value={aspect || ""}
                onChange={(e) =>
                  setAspect(e.target.value ? Number(e.target.value) : undefined)
                }
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="1">1:1 (Quadrado)</option>
                <option value="4/3">4:3</option>
                <option value="3/2">3:2</option>
                <option value="">Livre</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Arraste as bordas para ajustar o corte
            </div>
          </div>

          {/* Área de Crop */}
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={100}
              minHeight={100}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{
                  maxHeight: "400px",
                  maxWidth: "100%",
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Preview */}
          {completedCrop && (
            <div className="flex justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    border: "1px solid #ccc",
                    objectFit: "contain",
                    width: 150,
                    height: 150,
                  }}
                />
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onDownloadCropClick} disabled={!completedCrop}>
              Aplicar Corte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCrop;
