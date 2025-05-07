declare module 'chrome-aws-lambda' {
  const args: string[];
  const defaultViewport: {
    deviceScaleFactor: number;
    hasTouch: boolean;
    height: number;
    isLandscape: boolean;
    isMobile: boolean;
    width: number;
  };
  const executablePath: Promise<string>;
  const headless: boolean | 'new';
}

export = chromium; 