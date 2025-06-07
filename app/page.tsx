import WalletConnection from '../components/WalletConnection';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">        
        
        <div className="">
          <WalletConnection />         
          
        </div>
      </div>
    </div>
  );
};

export default Home;