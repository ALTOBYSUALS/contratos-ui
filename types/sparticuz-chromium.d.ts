declare module '@sparticuz/chromium' {
  interface DefaultViewport {
    deviceScaleFactor: number;
    hasTouch: boolean;
    height: number;
    isLandscape: boolean;
    isMobile: boolean;
    width: number;
  }

  interface ExecutablePathOptions {
    puppeteerCompatible?: boolean;
  }

  // List of exported properties and methods
  export const args: string[];
  export const defaultViewport: DefaultViewport;
  export const headless: boolean | 'shell';
  export let setGraphicsMode: boolean;
  export const graphics: boolean;
  
  // Function to load custom fonts
  export function font(url: string): Promise<string>;
  
  // Function to get executable path - supports both function call and property access patterns
  export function executablePath(location?: string): Promise<string>;
  export function executablePath(options?: ExecutablePathOptions): Promise<string>;
  
  // For backward compatibility with property access pattern
  export const executablePath: Promise<string>;
} 