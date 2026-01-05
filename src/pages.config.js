import CharacterSelect from './pages/CharacterSelect';
import Home from './pages/Home';
import PortraitCreatorPage from './pages/PortraitCreatorPage';
import SkillTreePage from './pages/SkillTreePage';
import SceneView from './pages/SceneView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CharacterSelect": CharacterSelect,
    "Home": Home,
    "PortraitCreatorPage": PortraitCreatorPage,
    "SkillTreePage": SkillTreePage,
    "SceneView": SceneView,
}

export const pagesConfig = {
    mainPage: "CharacterSelect",
    Pages: PAGES,
    Layout: __Layout,
};