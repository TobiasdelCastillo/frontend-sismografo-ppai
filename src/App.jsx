import {Inicio} from "./components/Inicio";
import { RevisionManual } from "./components/RevisionManual";
import { Routes, Route } from 'react-router-dom'

function App() {
return (
    <>
        <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/revisionManual" element={<RevisionManual />} />
        </Routes>
    </>
    
);
}
export default App;
