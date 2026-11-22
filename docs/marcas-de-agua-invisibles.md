# Marcas de agua invisibles

Las fotos nuevas de productos pueden llevar texto opcional; la herramienta
separada en **Administración → Marca de agua invisible** acepta una foto y
devuelve un PNG descargable sin reemplazar el original. Se aceptan fotos JPG,
PNG y WebP estáticas de hasta 8 MB, y el texto admite hasta 128 caracteres.

El texto se codifica en los bits menos significativos de los canales RGB de una
zona cuadrada de la imagen. Cada canal cambia como máximo un nivel de 256, por
lo que la modificación es imperceptible a simple vista. El tamaño define el
lado de esa zona como porcentaje del lado corto de la foto; la ubicación define
su esquina o centro. Si el área no tiene capacidad para el texto, el servidor
rechaza la operación en lugar de truncarlo. El PNG se genera localmente en el
servidor y conserva los píxeles sin compresión con pérdida; la orientación EXIF
se aplica, pero no se copian metadatos EXIF al archivo de salida.

El flujo de productos conserva la subida existente a Cloudinary, proveedor que
ya usa el proyecto: cuando hay marca se sube el PNG sin las transformaciones
con pérdida del flujo normal. La herramienta aislada no usa Cloudinary ni envía
la foto a otro servicio. No se conserva una copia modificada como original;
el resultado de producto es la imagen del producto.

La marca no está cifrada ni autenticada. El decodificador puede extraer y
verificar el texto mientras se conserven sus píxeles exactos, pero una
recompresión JPEG/WebP, redimensionamiento, recorte, retoque o transformación
puede dañarlo o borrarlo. No se garantiza resistencia a esas operaciones ni
protección contra falsificación o eliminación.
