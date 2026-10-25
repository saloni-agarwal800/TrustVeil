import type { Finding } from '@trustveil/shared';

/**
 * Layer 2 hook (local ML classifier).
 * Prototype ships a no-op. To add the real thing later:
 *  - export a small multilingual model to ONNX (int8)
 *  - run it with onnxruntime-web / Transformers.js inside an MV3 offscreen document
 *  - return Findings with source: 'ml' from classify()
 * Nothing else in the engine needs to change.
 */
export interface Layer2Classifier {
  classify(text: string): Promise<Finding[]>;
}

export const noopClassifier: Layer2Classifier = {
  async classify() {
    return [];
  }
};
