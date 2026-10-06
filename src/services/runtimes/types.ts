import { Character, FilmProject, RuntimeCapability, Shot, Take } from '../../types/film';

export interface ShotGenerationRequest {
  shot: Shot;
  project: FilmProject;
  characters: Character[];
  promptOverride?: string;
  referenceImageUrls?: string[];
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  warnings: string[];
  unsupportedFeatures: string[];
}

export interface IVideoRuntimeAdapter {
  id: string;
  name: string;
  declaration: RuntimeCapability;
  checkCompatibility(request: ShotGenerationRequest): CompatibilityCheckResult;
  generateTake(
    request: ShotGenerationRequest,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<Take>;
}
