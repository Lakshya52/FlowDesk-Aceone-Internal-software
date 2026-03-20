import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

declare module 'lucide-react';
declare module 'recharts';
declare module 'socket.io-client';
declare module 'react-router-dom';
