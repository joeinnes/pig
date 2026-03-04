export interface ResolvedPackage {
  name: string
  version: string
}

export interface ParsedLockfile {
  lockfileVersion: string
  projectRoot: string
  packages: ResolvedPackage[]
}
