import Header from './components/Header'
import Menu from './components/Menu'
import SocialFooter from './components/SocialFooter'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Menu />
        <SocialFooter />
      </main>
    </div>
  )
}

export default App
