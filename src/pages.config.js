import CharacterSelect from './pages/CharacterSelect';
import Home from './pages/Home';
import PortraitCreatorPage from './pages/PortraitCreatorPage';
import SceneView from './pages/SceneView';
import SkillTreePage from './pages/SkillTreePage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CharacterSelect": CharacterSelect,
    "Home": Home,
    "PortraitCreatorPage": PortraitCreatorPage,
    "SceneView": SceneView,
    "SkillTreePage": SkillTreePage,
}

export const pagesConfig = {
    mainPage: "CharacterSelect",
    Pages: PAGES,
    Layout: __Layout,
};