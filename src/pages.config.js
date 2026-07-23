/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ApoliceDetalhes from './pages/ApoliceDetalhes';
import Apolices from './pages/Apolices';
import CancelarApolice from './pages/CancelarApolice';
import Dashboard from './pages/Dashboard';
import EditarFechamento from './pages/EditarFechamento';
import EditarSinistro from './pages/EditarSinistro';
import FechamentoDetalhes from './pages/FechamentoDetalhes';
import Fechamentos from './pages/Fechamentos';
import GestaoUsuarios from './pages/GestaoUsuarios';
import Home from './pages/Home';
import NovaApolice from './pages/NovaApolice';
import NovoFechamento from './pages/NovoFechamento';
import NovoSinistro from './pages/NovoSinistro';
import RenovacoesApolices from './pages/RenovacoesApolices';
import RenovarApolice from './pages/RenovarApolice';
import RevisarApolice from './pages/RevisarApolice';
import SinistroDetalhes from './pages/SinistroDetalhes';
import Sinistros from './pages/Sinistros';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApoliceDetalhes": ApoliceDetalhes,
    "Apolices": Apolices,
    "CancelarApolice": CancelarApolice,
    "Dashboard": Dashboard,
    "EditarFechamento": EditarFechamento,
    "EditarSinistro": EditarSinistro,
    "FechamentoDetalhes": FechamentoDetalhes,
    "Fechamentos": Fechamentos,
    "GestaoUsuarios": GestaoUsuarios,
    "Home": Home,
    "NovaApolice": NovaApolice,
    "NovoFechamento": NovoFechamento,
    "NovoSinistro": NovoSinistro,
    "RenovacoesApolices": RenovacoesApolices,
    "RenovarApolice": RenovarApolice,
    "RevisarApolice": RevisarApolice,
    "SinistroDetalhes": SinistroDetalhes,
    "Sinistros": Sinistros,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};