/**
 * Image Watermark Service
 * 
 * Applies watermarks to marketplace preview images to protect against unauthorized copying
 * while maintaining the integrity of original assets in the secure filesystem.
 */

export interface WatermarkOptions {
  // The ID of the listing
  listingId: string;
  // Owner address to display in visible watermark
  ownerAddress: string;
  // Timestamp of when the watermark was applied
  timestamp?: number;
  // Optional custom text
  customText?: string;
  // Watermark opacity (0-1)
  opacity?: number;
  // Position ('topleft', 'topright', 'bottomleft', 'bottomright', 'center')
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'center';
  // Whether to include invisible watermark data
  includeInvisibleData?: boolean;
}

/**
 * Service for applying watermarks to images
 */
export class ImageWatermarkService {
  /**
   * Apply a visible watermark to an image
   * 
   * @param imageBuffer The original image buffer
   * @param options Watermarking options
   * @returns Promise with watermarked image buffer
   */
  async applyWatermark(imageBuffer: ArrayBuffer | Blob, options: WatermarkOptions): Promise<ArrayBuffer> {
    // Convert buffer to Blob if needed
    const blob = imageBuffer instanceof Blob ? 
      imageBuffer : 
      new Blob([imageBuffer], { type: 'image/png' });
    
    // Create bitmap from blob
    const imageBitmap = await createImageBitmap(blob);
    
    // Create canvas for watermarking
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    
    // Get context and draw original image
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw the original image
    ctx.drawImage(imageBitmap, 0, 0);
    
    // Apply visible watermark
    this.drawVisibleWatermark(ctx, imageBitmap.width, imageBitmap.height, options);
    
    // Apply invisible watermark if requested
    if (options.includeInvisibleData) {
      this.applyInvisibleWatermark(ctx, imageBitmap.width, imageBitmap.height, options);
    }
    
    // Convert back to buffer
    const watermarkedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
    
    // Convert Blob to ArrayBuffer
    return await watermarkedBlob.arrayBuffer();
  }
  
  /**
   * Draw a visible watermark on the canvas
   */
  private drawVisibleWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: WatermarkOptions
  ): void {
    // Set defaults
    const opacity = options.opacity || 0.3;
    const position = options.position || 'bottomright';
    
    // Format watermark text
    const timestamp = options.timestamp || Date.now();
    const date = new Date(timestamp).toISOString().split('T')[0];
    const truncatedAddress = this.truncateAddress(options.ownerAddress);
    const watermarkText = options.customText || 
      `ID: ${options.listingId.substring(0, 8)} • Owner: ${truncatedAddress} • Date: ${date}`;
    
    // Save context state
    ctx.save();
    
    // Set watermark style
    ctx.globalAlpha = opacity;
    ctx.font = `${Math.max(12, Math.floor(width / 40))}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    
    // Calculate text size and position
    const textWidth = ctx.measureText(watermarkText).width;
    const padding = 10;
    let x = 0;
    let y = 0;
    
    // Position based on option
    switch (position) {
      case 'topleft':
        x = padding;
        y = padding + 16;
        break;
      case 'topright':
        x = width - textWidth - padding;
        y = padding + 16;
        break;
      case 'bottomleft':
        x = padding;
        y = height - padding;
        break;
      case 'bottomright':
        x = width - textWidth - padding;
        y = height - padding;
        break;
      case 'center':
        x = (width - textWidth) / 2;
        y = height / 2;
        break;
    }
    
    // Draw text with stroke for visibility against any background
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
    
    // Restore context
    ctx.restore();
  }
  
  /**
   * Apply an invisible steganographic watermark
   * This implementation uses a simple LSB (Least Significant Bit) steganography
   * technique to embed data in the image's pixel data
   */
  private applyInvisibleWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: WatermarkOptions
  ): void {
    // Create the data to embed
    const dataToEmbed = JSON.stringify({
      listingId: options.listingId,
      owner: options.ownerAddress,
      timestamp: options.timestamp || Date.now()
    });
    
    // Convert to binary
    const binaryData = this.textToBinary(dataToEmbed);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Embed data in least significant bits
    // Only modify a small portion of the image to minimize visual impact
    const maxBitsToEmbed = Math.min(binaryData.length, Math.floor(data.length / 4));
    
    for (let i = 0; i < maxBitsToEmbed; i++) {
      // Every 4th byte in the data array is alpha channel, skip those
      const pixelIndex = (i * 4);
      
      // Only modify the red channel's least significant bit
      // This minimizes visual impact while still embedding our data
      if (binaryData[i] === '1') {
        data[pixelIndex] = data[pixelIndex] | 1; // Set LSB to 1
      } else {
        data[pixelIndex] = data[pixelIndex] & 254; // Set LSB to 0
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Extract invisible watermark from an image
   * @param imageBuffer Image buffer to extract from
   * @returns Promise with extracted data or null if not found
   */
  async extractInvisibleWatermark(imageBuffer: ArrayBuffer | Blob): Promise<any | null> {
    try {
      // Convert buffer to Blob if needed
      const blob = imageBuffer instanceof Blob ? 
        imageBuffer : 
        new Blob([imageBuffer], { type: 'image/png' });
      
      // Create bitmap from blob
      const imageBitmap = await createImageBitmap(blob);
      
      // Create canvas to extract pixel data
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      
      // Get context and draw image
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(imageBitmap, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Extract binary data from LSBs
      let binaryExtracted = '';
      for (let i = 0; i < Math.min(5000, Math.floor(data.length / 4)); i++) {
        const pixelIndex = (i * 4);
        // Extract from red channel LSB
        binaryExtracted += (data[pixelIndex] & 1) ? '1' : '0';
      }
      
      // Convert binary back to text
      const text = this.binaryToText(binaryExtracted);
      
      // Try to parse JSON
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse extracted watermark data as JSON');
        return null;
      }
    } catch (error) {
      console.error('Error extracting invisible watermark:', error);
      return null;
    }
  }
  
  /**
   * Check if an image contains our watermark
   * @param imageBuffer Image to check
   * @returns Promise with watermark data or null
   */
  async detectWatermark(imageBuffer: ArrayBuffer | Blob): Promise<{
    hasVisibleWatermark: boolean;
    invisibleData: any | null;
  }> {
    try {
      // First, check for invisible watermark
      const invisibleData = await this.extractInvisibleWatermark(imageBuffer);
      
      // For visible watermark, we'd need more complex image analysis
      // This is a simplified implementation that just checks for invisible watermark
      const hasVisibleWatermark = !!invisibleData; // Simplified approximation
      
      return {
        hasVisibleWatermark,
        invisibleData
      };
    } catch (error) {
      console.error('Error detecting watermark:', error);
      return {
        hasVisibleWatermark: false,
        invisibleData: null
      };
    }
  }
  
  /**
   * Helper to truncate Ethereum address for display
   */
  private truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  /**
   * Convert text to binary string
   */
  private textToBinary(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const binary = text.charCodeAt(i).toString(2);
      // Pad with 0s to ensure 8 bits
      result += '0'.repeat(8 - binary.length) + binary;
    }
    return result;
  }
  
  /**
   * Convert binary string to text
   */
  private binaryToText(binary: string): string {
    // Ensure the binary string length is a multiple of 8
    binary = binary.substring(0, Math.floor(binary.length / 8) * 8);
    
    let result = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substring(i, i + 8);
      result += String.fromCharCode(parseInt(byte, 2));
    }
    return result;
  }
}
