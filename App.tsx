
import React, { useState } from 'react';
import { View } from './types';
import Layout from './components/Layout';
import ChatView from './components/ChatView';

const App: React.FC = () => {
  const [activeView] = useState<View>('chat');

  return (
    <Layout activeView={activeView}>
      <div className="animate-fade-in">
        <ChatView />
      </div>
    </Layout>
  );
};

export default App;

