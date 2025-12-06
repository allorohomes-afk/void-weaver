import CharacterSelect from './pages/CharacterSelect';
import SceneView from './pages/SceneView';
import PortraitCreatorPage from './pages/PortraitCreatorPage';
import SkillTreePage from './pages/SkillTreePage';


export const PAGES = {
    "CharacterSelect": CharacterSelect,
    "SceneView": SceneView,
    "PortraitCreatorPage": PortraitCreatorPage,
    "SkillTreePage": SkillTreePage,
}

export const pagesConfig = {
    mainPage: "CharacterSelect",
    Pages: PAGES,
};