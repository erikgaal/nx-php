export interface PhpunitProjectGeneratorSchema {
  name: string;
  directory?: string;
  tags?: string;
  standaloneConfig?: boolean;
}