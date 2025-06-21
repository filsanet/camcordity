module.exports = {
  // Test environment
  testEnvironment: "jsdom",
  
  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  
  // Module file extensions
  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
  
  // Transform files
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
    "^.+\\.css$": "jest-transform-stub",
    "^.+\\.scss$": "jest-transform-stub",
    "^.+\\.(jpg|jpeg|png|gif|svg)$": "jest-transform-stub"
  },
  
  // Module name mapping for webpack aliases and assets
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^.+\\.(css|scss|sass)$": "identity-obj-proxy",
    "^.+\\.(jpg|jpeg|png|gif|svg)$": "jest-transform-stub"
  },
  
  // Test file patterns
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)",
    "<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)"
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/build/"
  ],
  
  // Collect coverage from these files
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/index.jsx",
    "!src/setupTests.js"
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: ["text", "lcov", "html"],
  
  // Mock global objects and APIs
  globals: {
    "process.env.NODE_ENV": "test"
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true
};