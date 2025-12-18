import CharacterSelect from './pages/CharacterSelect';
import SceneView from './pages/SceneView';
import PortraitCreatorPage from './pages/PortraitCreatorPage';
import SkillTreePage from './pages/SkillTreePage';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CharacterSelect": CharacterSelect,
    "SceneView": SceneView,
    "PortraitCreatorPage": PortraitCreatorPage,
    "SkillTreePage": SkillTreePage,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "CharacterSelect",
    Pages: PAGES,
    Layout: __Layout,
};