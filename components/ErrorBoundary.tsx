'use client';
import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{children: ReactNode},{hasError:boolean}> {
  constructor(props:any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(error:any) {
    console.error('Component error caught:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error detectado</h2>
          <p className="text-red-600">Por favor, intenta refrescar la página.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Refrescar
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
} 