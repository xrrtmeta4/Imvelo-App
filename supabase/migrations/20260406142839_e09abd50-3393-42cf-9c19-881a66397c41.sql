
-- Create enum for node types
CREATE TYPE public.knowledge_node_type AS ENUM (
  'crop', 'pest', 'disease', 'treatment', 'soil_type', 'season', 'region'
);

-- Create enum for edge relationships
CREATE TYPE public.knowledge_relationship AS ENUM (
  'affects', 'treats', 'grows_in', 'thrives_in', 'companion_to', 
  'incompatible_with', 'seasonal_for', 'found_in'
);

-- Create knowledge_nodes table
CREATE TABLE public.knowledge_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_type knowledge_node_type NOT NULL,
  name TEXT NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  properties JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_nodes_type ON public.knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_name ON public.knowledge_nodes(name);
CREATE INDEX idx_knowledge_nodes_aliases ON public.knowledge_nodes USING GIN(aliases);

-- Create knowledge_edges table
CREATE TABLE public.knowledge_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship knowledge_relationship NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB DEFAULT '{}'::jsonb,
  reported_by_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_node_id, target_node_id, relationship)
);

CREATE INDEX idx_knowledge_edges_source ON public.knowledge_edges(source_node_id);
CREATE INDEX idx_knowledge_edges_target ON public.knowledge_edges(target_node_id);
CREATE INDEX idx_knowledge_edges_relationship ON public.knowledge_edges(relationship);

-- Create knowledge_contributions table
CREATE TABLE public.knowledge_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contribution_type TEXT NOT NULL,
  source_node_id UUID REFERENCES public.knowledge_nodes(id),
  target_node_id UUID REFERENCES public.knowledge_nodes(id),
  edge_relationship TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_contributions_user ON public.knowledge_contributions(user_id);

-- Enable RLS
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_contributions ENABLE ROW LEVEL SECURITY;

-- RLS: knowledge_nodes - publicly readable by authenticated users
CREATE POLICY "Authenticated users can read knowledge nodes"
ON public.knowledge_nodes FOR SELECT TO authenticated
USING (true);

-- RLS: knowledge_edges - publicly readable by authenticated users
CREATE POLICY "Authenticated users can read knowledge edges"
ON public.knowledge_edges FOR SELECT TO authenticated
USING (true);

-- RLS: knowledge_contributions - user-scoped
CREATE POLICY "Users can view own contributions"
ON public.knowledge_contributions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contributions"
ON public.knowledge_contributions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_knowledge_nodes_updated_at
BEFORE UPDATE ON public.knowledge_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_edges_updated_at
BEFORE UPDATE ON public.knowledge_edges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SEED DATA =====

-- Crops (50)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('crop', 'Maize', '["Corn","Mealies","Umbila"]', '{"family":"Poaceae","water_needs":"medium","npk":"120-60-40","temp_range_c":[18,35]}', 0.95),
('crop', 'Rice', '["Paddy"]', '{"family":"Poaceae","water_needs":"high","npk":"100-50-50","temp_range_c":[20,37]}', 0.95),
('crop', 'Wheat', '["Koringi"]', '{"family":"Poaceae","water_needs":"medium","npk":"120-60-40","temp_range_c":[12,25]}', 0.95),
('crop', 'Sorghum', '["Mabele","Amabele"]', '{"family":"Poaceae","water_needs":"low","npk":"80-40-40","temp_range_c":[25,40]}', 0.90),
('crop', 'Millet', '["Finger Millet","Pearl Millet"]', '{"family":"Poaceae","water_needs":"low","npk":"60-30-30","temp_range_c":[25,35]}', 0.90),
('crop', 'Cassava', '["Manioc","Umgcambane"]', '{"family":"Euphorbiaceae","water_needs":"low","npk":"80-40-100","temp_range_c":[25,35]}', 0.90),
('crop', 'Sweet Potato', '["Ubhatata"]', '{"family":"Convolvulaceae","water_needs":"medium","npk":"60-60-120","temp_range_c":[20,30]}', 0.90),
('crop', 'Potato', '["Amazambane"]', '{"family":"Solanaceae","water_needs":"high","npk":"150-100-150","temp_range_c":[15,25]}', 0.90),
('crop', 'Groundnut', '["Peanut","Emankindzane"]', '{"family":"Fabaceae","water_needs":"medium","npk":"20-40-40","temp_range_c":[20,35]}', 0.90),
('crop', 'Soybean', '["Soya"]', '{"family":"Fabaceae","water_needs":"medium","npk":"20-60-40","temp_range_c":[20,30]}', 0.90),
('crop', 'Cowpea', '["Black-eyed Pea","Imbumba"]', '{"family":"Fabaceae","water_needs":"low","npk":"20-40-40","temp_range_c":[25,35]}', 0.85),
('crop', 'Pigeon Pea', '["Cajanus"]', '{"family":"Fabaceae","water_needs":"low","npk":"20-40-40","temp_range_c":[20,35]}', 0.80),
('crop', 'Common Bean', '["Ubontjisi"]', '{"family":"Fabaceae","water_needs":"medium","npk":"20-60-60","temp_range_c":[18,28]}', 0.85),
('crop', 'Tomato', '["Tamatisi"]', '{"family":"Solanaceae","water_needs":"high","npk":"120-80-150","temp_range_c":[20,30]}', 0.90),
('crop', 'Onion', '["Anyanisi"]', '{"family":"Amaryllidaceae","water_needs":"medium","npk":"100-80-80","temp_range_c":[13,28]}', 0.85),
('crop', 'Cabbage', '["Ikhabishi"]', '{"family":"Brassicaceae","water_needs":"high","npk":"150-60-120","temp_range_c":[15,25]}', 0.85),
('crop', 'Spinach', '["Imifino"]', '{"family":"Amaranthaceae","water_needs":"high","npk":"100-50-100","temp_range_c":[15,25]}', 0.85),
('crop', 'Okra', '["Lady Fingers","Idelele"]', '{"family":"Malvaceae","water_needs":"medium","npk":"80-60-60","temp_range_c":[25,35]}', 0.80),
('crop', 'Pumpkin', '["Ithanga"]', '{"family":"Cucurbitaceae","water_needs":"medium","npk":"80-60-80","temp_range_c":[20,30]}', 0.85),
('crop', 'Watermelon', '["Ikhabe"]', '{"family":"Cucurbitaceae","water_needs":"medium","npk":"80-60-60","temp_range_c":[22,32]}', 0.85),
('crop', 'Sugarcane', '["Umoba"]', '{"family":"Poaceae","water_needs":"very_high","npk":"200-80-200","temp_range_c":[20,35]}', 0.95),
('crop', 'Cotton', '["Ukotini"]', '{"family":"Malvaceae","water_needs":"medium","npk":"100-50-50","temp_range_c":[20,35]}', 0.85),
('crop', 'Tobacco', '["Ugwayi"]', '{"family":"Solanaceae","water_needs":"medium","npk":"60-80-120","temp_range_c":[20,30]}', 0.85),
('crop', 'Sunflower', '["Ligcikigciki"]', '{"family":"Asteraceae","water_needs":"low","npk":"60-40-40","temp_range_c":[20,30]}', 0.85),
('crop', 'Coffee', '["Ikhofi"]', '{"family":"Rubiaceae","water_needs":"high","npk":"150-30-150","temp_range_c":[15,28]}', 0.85),
('crop', 'Tea', '["Litiye"]', '{"family":"Theaceae","water_needs":"high","npk":"120-40-80","temp_range_c":[15,25]}', 0.80),
('crop', 'Cocoa', '["Cacao"]', '{"family":"Malvaceae","water_needs":"high","npk":"60-30-100","temp_range_c":[20,30]}', 0.80),
('crop', 'Banana', '["Libhanana"]', '{"family":"Musaceae","water_needs":"high","npk":"200-60-400","temp_range_c":[20,35]}', 0.90),
('crop', 'Mango', '["Umango"]', '{"family":"Anacardiaceae","water_needs":"medium","npk":"100-50-100","temp_range_c":[24,35]}', 0.85),
('crop', 'Avocado', '["Lipheya"]', '{"family":"Lauraceae","water_needs":"medium","npk":"80-40-120","temp_range_c":[16,30]}', 0.85),
('crop', 'Citrus', '["Orange","Lemon","Lime"]', '{"family":"Rutaceae","water_needs":"medium","npk":"200-80-150","temp_range_c":[15,35]}', 0.90),
('crop', 'Pineapple', '["Lilananasi"]', '{"family":"Bromeliaceae","water_needs":"low","npk":"150-40-200","temp_range_c":[20,32]}', 0.85),
('crop', 'Papaya', '["Phopho"]', '{"family":"Caricaceae","water_needs":"medium","npk":"200-200-200","temp_range_c":[22,33]}', 0.80),
('crop', 'Yam', '["Dioscorea"]', '{"family":"Dioscoreaceae","water_needs":"medium","npk":"80-40-80","temp_range_c":[25,35]}', 0.80),
('crop', 'Taro', '["Amadumbe","Cocoyam"]', '{"family":"Araceae","water_needs":"high","npk":"80-40-120","temp_range_c":[20,30]}', 0.80),
('crop', 'Sesame', '["Simsim"]', '{"family":"Pedaliaceae","water_needs":"low","npk":"40-20-20","temp_range_c":[25,35]}', 0.75),
('crop', 'Moringa', '["Drumstick Tree"]', '{"family":"Moringaceae","water_needs":"low","npk":"40-20-20","temp_range_c":[25,40]}', 0.80),
('crop', 'Amaranth', '["Imbuya","Pigweed"]', '{"family":"Amaranthaceae","water_needs":"low","npk":"60-40-40","temp_range_c":[20,35]}', 0.80),
('crop', 'Bambara Groundnut', '["Jugo Bean","Tindlubu"]', '{"family":"Fabaceae","water_needs":"low","npk":"20-40-40","temp_range_c":[20,35]}', 0.80),
('crop', 'Teff', '["Eragrostis tef"]', '{"family":"Poaceae","water_needs":"medium","npk":"60-30-30","temp_range_c":[15,27]}', 0.75),
('crop', 'Fonio', '["Digitaria"]', '{"family":"Poaceae","water_needs":"low","npk":"40-20-20","temp_range_c":[25,35]}', 0.70),
('crop', 'Enset', '["False Banana"]', '{"family":"Musaceae","water_needs":"high","npk":"100-40-200","temp_range_c":[15,25]}', 0.70),
('crop', 'Chickpea', '["Garbanzo"]', '{"family":"Fabaceae","water_needs":"low","npk":"20-60-40","temp_range_c":[15,28]}', 0.80),
('crop', 'Lentil', '["Dal"]', '{"family":"Fabaceae","water_needs":"low","npk":"20-40-20","temp_range_c":[15,25]}', 0.75),
('crop', 'Carrot', '["Ikhaerothi"]', '{"family":"Apiaceae","water_needs":"medium","npk":"80-60-100","temp_range_c":[15,25]}', 0.85),
('crop', 'Pepper', '["Chili","Capsicum","Ipelepele"]', '{"family":"Solanaceae","water_needs":"medium","npk":"120-80-100","temp_range_c":[20,32]}', 0.85),
('crop', 'Eggplant', '["Aubergine","Brinjal"]', '{"family":"Solanaceae","water_needs":"medium","npk":"120-80-100","temp_range_c":[22,32]}', 0.80),
('crop', 'Cucumber', '["Ikhukhamba"]', '{"family":"Cucurbitaceae","water_needs":"high","npk":"80-60-60","temp_range_c":[20,30]}', 0.85),
('crop', 'Lettuce', '["Iletisi"]', '{"family":"Asteraceae","water_needs":"high","npk":"100-50-100","temp_range_c":[15,22]}', 0.80),
('crop', 'Green Bean', '["Ubontjisi Luhlata"]', '{"family":"Fabaceae","water_needs":"medium","npk":"20-60-60","temp_range_c":[18,28]}', 0.80);

-- Pests & Diseases (80)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('pest', 'Fall Armyworm', '["Spodoptera frugiperda","FAW"]', '{"type":"insect","lifecycle_days":30,"damage_type":"leaf_feeding"}', 0.95),
('pest', 'Stem Borer', '["Busseola fusca","Chilo partellus"]', '{"type":"insect","lifecycle_days":45,"damage_type":"stem_boring"}', 0.90),
('pest', 'Aphid', '["Plant Lice","Greenfly"]', '{"type":"insect","lifecycle_days":7,"damage_type":"sap_sucking"}', 0.90),
('pest', 'Whitefly', '["Bemisia tabaci"]', '{"type":"insect","lifecycle_days":21,"damage_type":"sap_sucking"}', 0.85),
('pest', 'Bollworm', '["Helicoverpa armigera","African Bollworm"]', '{"type":"insect","lifecycle_days":35,"damage_type":"fruit_boring"}', 0.90),
('pest', 'Locust', '["Desert Locust","Red Locust"]', '{"type":"insect","lifecycle_days":60,"damage_type":"defoliation"}', 0.90),
('pest', 'Grasshopper', '["Elegans","Short-horned"]', '{"type":"insect","lifecycle_days":50,"damage_type":"leaf_feeding"}', 0.85),
('pest', 'Cutworm', '["Agrotis"]', '{"type":"insect","lifecycle_days":30,"damage_type":"stem_cutting"}', 0.85),
('pest', 'Leafminer', '["Liriomyza"]', '{"type":"insect","lifecycle_days":20,"damage_type":"leaf_mining"}', 0.80),
('pest', 'Thrips', '["Frankliniella","Thrips tabaci"]', '{"type":"insect","lifecycle_days":14,"damage_type":"rasping"}', 0.85),
('pest', 'Mealybug', '["Pseudococcidae"]', '{"type":"insect","lifecycle_days":30,"damage_type":"sap_sucking"}', 0.80),
('pest', 'Spider Mite', '["Tetranychus urticae","Red Spider Mite"]', '{"type":"arachnid","lifecycle_days":14,"damage_type":"sap_sucking"}', 0.85),
('pest', 'Fruit Fly', '["Ceratitis","Bactrocera"]', '{"type":"insect","lifecycle_days":21,"damage_type":"fruit_damage"}', 0.85),
('pest', 'Root Knot Nematode', '["Meloidogyne"]', '{"type":"nematode","lifecycle_days":28,"damage_type":"root_galling"}', 0.85),
('pest', 'Stalk Borer', '["Busseola fusca"]', '{"type":"insect","lifecycle_days":40,"damage_type":"stem_boring"}', 0.85),
('pest', 'Weevil', '["Grain Weevil","Sitophilus"]', '{"type":"insect","lifecycle_days":35,"damage_type":"grain_damage"}', 0.85),
('pest', 'Termite', '["White Ant","Macrotermes"]', '{"type":"insect","lifecycle_days":365,"damage_type":"root_stem_damage"}', 0.85),
('pest', 'Leaf Beetle', '["Chrysomelidae"]', '{"type":"insect","lifecycle_days":30,"damage_type":"leaf_feeding"}', 0.75),
('pest', 'Cabbage Moth', '["Plutella xylostella","Diamondback Moth"]', '{"type":"insect","lifecycle_days":21,"damage_type":"leaf_feeding"}', 0.85),
('pest', 'Tuta absoluta', '["Tomato Leafminer","South American Tomato Moth"]', '{"type":"insect","lifecycle_days":25,"damage_type":"leaf_fruit_mining"}', 0.90),
('disease', 'Maize Streak Virus', '["MSV"]', '{"type":"viral","vector":"leafhopper","symptoms":"yellow_streaks"}', 0.90),
('disease', 'Cassava Mosaic Disease', '["CMD"]', '{"type":"viral","vector":"whitefly","symptoms":"leaf_mosaic"}', 0.90),
('disease', 'Rice Blast', '["Magnaporthe oryzae"]', '{"type":"fungal","symptoms":"diamond_lesions"}', 0.90),
('disease', 'Wheat Rust', '["Puccinia","Stem Rust","Leaf Rust"]', '{"type":"fungal","symptoms":"rust_pustules"}', 0.90),
('disease', 'Late Blight', '["Phytophthora infestans"]', '{"type":"oomycete","symptoms":"dark_lesions_rotting"}', 0.90),
('disease', 'Early Blight', '["Alternaria solani"]', '{"type":"fungal","symptoms":"concentric_ring_spots"}', 0.85),
('disease', 'Powdery Mildew', '["Erysiphe","Oidium"]', '{"type":"fungal","symptoms":"white_powder_coating"}', 0.85),
('disease', 'Downy Mildew', '["Peronospora","Sclerospora"]', '{"type":"oomycete","symptoms":"yellow_patches_underside_growth"}', 0.85),
('disease', 'Fusarium Wilt', '["Fusarium oxysporum"]', '{"type":"fungal","symptoms":"wilting_yellowing"}', 0.85),
('disease', 'Anthracnose', '["Colletotrichum"]', '{"type":"fungal","symptoms":"dark_sunken_lesions"}', 0.85),
('disease', 'Bacterial Wilt', '["Ralstonia solanacearum"]', '{"type":"bacterial","symptoms":"rapid_wilting"}', 0.85),
('disease', 'Black Rot', '["Xanthomonas campestris"]', '{"type":"bacterial","symptoms":"v_shaped_lesions"}', 0.80),
('disease', 'Leaf Spot', '["Cercospora","Septoria"]', '{"type":"fungal","symptoms":"circular_brown_spots"}', 0.80),
('disease', 'Root Rot', '["Pythium","Rhizoctonia"]', '{"type":"fungal","symptoms":"root_decay_wilting"}', 0.80),
('disease', 'Smut', '["Ustilago","Covered Smut","Loose Smut"]', '{"type":"fungal","symptoms":"dark_masses_spores"}', 0.80),
('disease', 'Banana Bunchy Top', '["BBTV"]', '{"type":"viral","vector":"aphid","symptoms":"stunting_bunching"}', 0.85),
('disease', 'Cassava Brown Streak', '["CBSD"]', '{"type":"viral","vector":"whitefly","symptoms":"brown_streaks_root_necrosis"}', 0.85),
('disease', 'Coffee Berry Disease', '["Colletotrichum kahawae"]', '{"type":"fungal","symptoms":"dark_sunken_berry_lesions"}', 0.80),
('disease', 'Grey Mould', '["Botrytis cinerea"]', '{"type":"fungal","symptoms":"grey_fuzzy_growth"}', 0.80),
('disease', 'Citrus Greening', '["Huanglongbing","HLB"]', '{"type":"bacterial","vector":"psyllid","symptoms":"yellow_shoots_bitter_fruit"}', 0.85),
('disease', 'Panama Disease', '["Fusarium oxysporum f.sp. cubense","TR4"]', '{"type":"fungal","symptoms":"pseudostem_splitting_wilting"}', 0.85),
('disease', 'Aflatoxin Contamination', '["Aspergillus flavus"]', '{"type":"fungal","symptoms":"mold_growth_toxin"}', 0.85),
('disease', 'Maize Lethal Necrosis', '["MLN"]', '{"type":"viral","symptoms":"severe_necrosis_death"}', 0.85),
('pest', 'Quelea Bird', '["Red-billed Quelea"]', '{"type":"bird","damage_type":"grain_feeding"}', 0.85),
('pest', 'Rodent', '["Rat","Mouse","Mastomys"]', '{"type":"mammal","damage_type":"grain_root_damage"}', 0.80),
('pest', 'Snail', '["Giant African Snail","Achatina"]', '{"type":"mollusk","damage_type":"leaf_feeding"}', 0.75),
('pest', 'Caterpillar', '["Spodoptera","Heliothis"]', '{"type":"insect","lifecycle_days":25,"damage_type":"leaf_feeding"}', 0.80),
('disease', 'Tomato Yellow Leaf Curl', '["TYLCV"]', '{"type":"viral","vector":"whitefly","symptoms":"leaf_curling_yellowing"}', 0.85),
('disease', 'Xanthomonas Wilt', '["BXW","Banana Xanthomonas Wilt"]', '{"type":"bacterial","symptoms":"premature_ripening_ooze"}', 0.85),
('disease', 'Streak Disease', '["Maize Streak"]', '{"type":"viral","vector":"leafhopper","symptoms":"chlorotic_streaks"}', 0.80),
('pest', 'Scale Insect', '["Coccidae","Diaspididae"]', '{"type":"insect","lifecycle_days":40,"damage_type":"sap_sucking"}', 0.75),
('pest', 'Wireworm', '["Elateridae larvae"]', '{"type":"insect","lifecycle_days":365,"damage_type":"root_damage"}', 0.75),
('pest', 'Bean Fly', '["Ophiomyia phaseoli"]', '{"type":"insect","lifecycle_days":20,"damage_type":"stem_mining"}', 0.80),
('pest', 'Pod Borer', '["Maruca vitrata"]', '{"type":"insect","lifecycle_days":25,"damage_type":"pod_boring"}', 0.80),
('pest', 'Shoot Fly', '["Atherigona soccata"]', '{"type":"insect","lifecycle_days":20,"damage_type":"shoot_damage"}', 0.80),
('pest', 'Stink Bug', '["Nezara viridula","Green Stink Bug"]', '{"type":"insect","lifecycle_days":35,"damage_type":"sap_sucking"}', 0.75),
('disease', 'Septoria Leaf Blotch', '["Zymoseptoria tritici"]', '{"type":"fungal","symptoms":"tan_blotches_pycnidia"}', 0.80),
('disease', 'Soybean Rust', '["Phakopsora pachyrhizi"]', '{"type":"fungal","symptoms":"tan_red_lesions"}', 0.80),
('disease', 'Groundnut Rosette', '["GRV"]', '{"type":"viral","vector":"aphid","symptoms":"stunting_chlorosis"}', 0.80),
('disease', 'Witchweed', '["Striga","Striga hermonthica"]', '{"type":"parasitic_plant","symptoms":"stunting_wilting"}', 0.85);

-- Treatments (60)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('treatment', 'Neem Oil', '["Azadirachtin"]', '{"type":"biopesticide","application":"foliar_spray","dosage":"5ml/L","organic":true}', 0.90),
('treatment', 'Bt (Bacillus thuringiensis)', '["Dipel","Thuricide"]', '{"type":"biopesticide","application":"foliar_spray","organic":true}', 0.90),
('treatment', 'Pyrethrin', '["Pyrethrum"]', '{"type":"botanical_pesticide","application":"foliar_spray","organic":true}', 0.85),
('treatment', 'Cypermethrin', '["Cymbush","Ripcord"]', '{"type":"synthetic_pyrethroid","application":"foliar_spray","organic":false}', 0.85),
('treatment', 'Chlorpyrifos', '["Dursban"]', '{"type":"organophosphate","application":"soil_drench_foliar","organic":false}', 0.80),
('treatment', 'Imidacloprid', '["Confidor","Gaucho"]', '{"type":"neonicotinoid","application":"seed_treatment_foliar","organic":false}', 0.85),
('treatment', 'Lambda-cyhalothrin', '["Karate"]', '{"type":"synthetic_pyrethroid","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Spinosad', '["Success","Tracer"]', '{"type":"biopesticide","application":"foliar_spray","organic":true}', 0.85),
('treatment', 'Mancozeb', '["Dithane"]', '{"type":"fungicide","application":"foliar_spray","organic":false}', 0.85),
('treatment', 'Copper Oxychloride', '["Copper Fungicide"]', '{"type":"fungicide","application":"foliar_spray","organic":true}', 0.85),
('treatment', 'Metalaxyl', '["Ridomil"]', '{"type":"fungicide","application":"seed_treatment_foliar","organic":false}', 0.80),
('treatment', 'Carbendazim', '["Bavistin"]', '{"type":"fungicide","application":"foliar_seed_treatment","organic":false}', 0.80),
('treatment', 'Trichoderma', '["Trichoderma harzianum"]', '{"type":"biofungicide","application":"soil_application","organic":true}', 0.85),
('treatment', 'Crop Rotation', '[]', '{"type":"cultural_practice","application":"field_management","organic":true}', 0.90),
('treatment', 'Intercropping', '["Mixed Cropping"]', '{"type":"cultural_practice","application":"field_management","organic":true}', 0.85),
('treatment', 'Push-Pull Technology', '["Desmodium-Napier"]', '{"type":"cultural_practice","application":"field_management","organic":true}', 0.90),
('treatment', 'Trap Cropping', '["Border Planting"]', '{"type":"cultural_practice","application":"field_management","organic":true}', 0.80),
('treatment', 'Manual Removal', '["Hand Picking","Scouting"]', '{"type":"mechanical","application":"manual","organic":true}', 0.85),
('treatment', 'Pheromone Traps', '["Lure Traps"]', '{"type":"behavioral","application":"trap_placement","organic":true}', 0.80),
('treatment', 'Resistant Varieties', '["Tolerant Cultivars"]', '{"type":"genetic","application":"seed_selection","organic":true}', 0.90),
('treatment', 'Mulching', '["Organic Mulch"]', '{"type":"cultural_practice","application":"soil_cover","organic":true}', 0.85),
('treatment', 'Composting', '["Organic Compost"]', '{"type":"soil_amendment","application":"soil_application","organic":true}', 0.90),
('treatment', 'Lime Application', '["Agricultural Lime","Dolomite"]', '{"type":"soil_amendment","application":"soil_application","purpose":"pH_correction"}', 0.85),
('treatment', 'NPK Fertilizer', '["Compound Fertilizer"]', '{"type":"synthetic_fertilizer","application":"soil_basal_topdress","organic":false}', 0.85),
('treatment', 'Urea', '["46-0-0"]', '{"type":"nitrogen_fertilizer","application":"topdress","organic":false}', 0.85),
('treatment', 'DAP', '["Di-ammonium Phosphate","18-46-0"]', '{"type":"phosphorus_fertilizer","application":"basal","organic":false}', 0.85),
('treatment', 'Vermicompost', '["Worm Castings"]', '{"type":"organic_fertilizer","application":"soil_application","organic":true}', 0.80),
('treatment', 'Wood Ash', '["Potash"]', '{"type":"traditional_amendment","application":"soil_application","organic":true}', 0.75),
('treatment', 'Manure', '["Cattle Manure","Chicken Manure"]', '{"type":"organic_fertilizer","application":"soil_application","organic":true}', 0.85),
('treatment', 'Drip Irrigation', '["Trickle Irrigation"]', '{"type":"water_management","application":"field_infrastructure"}', 0.85),
('treatment', 'Furrow Irrigation', '["Channel Irrigation"]', '{"type":"water_management","application":"field_infrastructure"}', 0.75),
('treatment', 'Rainwater Harvesting', '["Water Collection"]', '{"type":"water_management","application":"infrastructure"}', 0.80),
('treatment', 'Sulfur Dust', '["Wettable Sulfur"]', '{"type":"fungicide_acaricide","application":"foliar_dust","organic":true}', 0.80),
('treatment', 'Garlic Spray', '["Garlic Extract"]', '{"type":"traditional_remedy","application":"foliar_spray","organic":true}', 0.70),
('treatment', 'Chili Pepper Spray', '["Hot Pepper Extract"]', '{"type":"traditional_remedy","application":"foliar_spray","organic":true}', 0.70),
('treatment', 'Tobacco Leaf Extract', '["Nicotine Solution"]', '{"type":"traditional_remedy","application":"foliar_spray","organic":true}', 0.65),
('treatment', 'Solarization', '["Soil Solarization"]', '{"type":"physical","application":"soil_treatment","organic":true}', 0.80),
('treatment', 'Seed Treatment', '["Seed Dressing"]', '{"type":"preventive","application":"pre_planting"}', 0.85),
('treatment', 'Early Planting', '["Timely Planting"]', '{"type":"cultural_practice","application":"timing"}', 0.80),
('treatment', 'Proper Spacing', '["Optimal Plant Density"]', '{"type":"cultural_practice","application":"planting"}', 0.80),
('treatment', 'Sanitation', '["Field Hygiene","Crop Residue Removal"]', '{"type":"cultural_practice","application":"post_harvest"}', 0.85),
('treatment', 'Biological Control', '["Biocontrol Agents","Parasitoid Wasps"]', '{"type":"biological","application":"release","organic":true}', 0.80),
('treatment', 'Emamectin Benzoate', '["Proclaim"]', '{"type":"insecticide","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Thiamethoxam', '["Actara"]', '{"type":"neonicotinoid","application":"foliar_soil","organic":false}', 0.80),
('treatment', 'Abamectin', '["Vertimec"]', '{"type":"acaricide_insecticide","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Propiconazole', '["Tilt"]', '{"type":"fungicide","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Tebuconazole', '["Folicur"]', '{"type":"fungicide","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Azoxystrobin', '["Amistar"]', '{"type":"fungicide","application":"foliar_spray","organic":false}', 0.80),
('treatment', 'Beauveria bassiana', '["Mycotrol"]', '{"type":"entomopathogenic_fungus","application":"foliar_spray","organic":true}', 0.80),
('treatment', 'Metarhizium anisopliae', '["Green Muscle"]', '{"type":"entomopathogenic_fungus","application":"foliar_spray","organic":true}', 0.80),
('treatment', 'Cover Cropping', '["Green Manure"]', '{"type":"cultural_practice","application":"field_management","organic":true}', 0.80),
('treatment', 'Conservation Tillage', '["Minimum Tillage","No-Till"]', '{"type":"cultural_practice","application":"land_preparation","organic":true}', 0.80),
('treatment', 'Grafting', '["Top Grafting"]', '{"type":"horticultural","application":"propagation"}', 0.75),
('treatment', 'Pruning', '["Trimming","Canopy Management"]', '{"type":"horticultural","application":"plant_management"}', 0.80),
('treatment', 'Staking', '["Trellising","Support"]', '{"type":"mechanical","application":"plant_support"}', 0.75),
('treatment', 'Raised Beds', '["Ridge Planting"]', '{"type":"cultural_practice","application":"land_preparation"}', 0.80),
('treatment', 'Organic Soap Spray', '["Insecticidal Soap"]', '{"type":"biopesticide","application":"foliar_spray","organic":true}', 0.75),
('treatment', 'Diatomaceous Earth', '["DE","Fossil Shell Flour"]', '{"type":"physical_insecticide","application":"dust","organic":true}', 0.75),
('treatment', 'Phosphoric Acid', '["Foscal"]', '{"type":"fungicide_fertilizer","application":"foliar_drench","organic":false}', 0.70),
('treatment', 'Potassium Permanganate', '["KMnO4"]', '{"type":"disinfectant","application":"seed_soil_treatment","organic":false}', 0.70);

-- Soil Types (10)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('soil_type', 'Clay Soil', '["Heavy Soil"]', '{"texture":"fine","drainage":"poor","water_retention":"high","pH_range":[5.5,7.5],"workability":"difficult"}', 0.90),
('soil_type', 'Sandy Soil', '["Light Soil"]', '{"texture":"coarse","drainage":"excellent","water_retention":"low","pH_range":[5.5,7.0],"workability":"easy"}', 0.90),
('soil_type', 'Loamy Soil', '["Garden Soil"]', '{"texture":"medium","drainage":"good","water_retention":"moderate","pH_range":[6.0,7.0],"workability":"good"}', 0.95),
('soil_type', 'Silt Soil', '["Alluvial"]', '{"texture":"fine_medium","drainage":"moderate","water_retention":"high","pH_range":[6.0,7.0],"workability":"moderate"}', 0.85),
('soil_type', 'Peat Soil', '["Organic Soil","Bog Soil"]', '{"texture":"organic","drainage":"poor","water_retention":"very_high","pH_range":[3.5,5.5],"workability":"moderate"}', 0.80),
('soil_type', 'Chalky Soil', '["Alkaline Soil","Calcareous"]', '{"texture":"variable","drainage":"good","water_retention":"low","pH_range":[7.5,8.5],"workability":"moderate"}', 0.80),
('soil_type', 'Laterite Soil', '["Ferralitic","Red Soil"]', '{"texture":"variable","drainage":"good","water_retention":"low","pH_range":[4.5,6.0],"workability":"moderate"}', 0.85),
('soil_type', 'Black Cotton Soil', '["Vertisol","Expansive Clay"]', '{"texture":"heavy_clay","drainage":"very_poor","water_retention":"very_high","pH_range":[6.5,8.0],"workability":"very_difficult"}', 0.85),
('soil_type', 'Sandy Loam', '["Light Loam"]', '{"texture":"medium_coarse","drainage":"good","water_retention":"moderate","pH_range":[5.5,7.0],"workability":"good"}', 0.90),
('soil_type', 'Clay Loam', '["Heavy Loam"]', '{"texture":"medium_fine","drainage":"moderate","water_retention":"high","pH_range":[5.5,7.5],"workability":"moderate"}', 0.85);

-- Seasons (6)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('season', 'Summer', '["Wet Season","Rainy Season","Lisimane"]', '{"months":[10,11,12,1,2,3],"hemisphere":"southern","rainfall":"high","temp":"hot"}', 0.95),
('season', 'Winter', '["Dry Season","Cold Season","Busika"]', '{"months":[4,5,6,7,8,9],"hemisphere":"southern","rainfall":"low","temp":"cool"}', 0.95),
('season', 'Long Rains', '["Masika","Main Season"]', '{"months":[3,4,5],"region":"east_africa","rainfall":"heavy"}', 0.85),
('season', 'Short Rains', '["Vuli","Minor Season"]', '{"months":[10,11,12],"region":"east_africa","rainfall":"moderate"}', 0.85),
('season', 'Harmattan', '["Dry Dusty Season"]', '{"months":[11,12,1,2,3],"region":"west_africa","rainfall":"none","temp":"cool_dry"}', 0.80),
('season', 'Spring', '["Early Planting Season"]', '{"months":[8,9,10],"hemisphere":"southern","rainfall":"increasing","temp":"warming"}', 0.85);

-- Regions (30 African)
INSERT INTO public.knowledge_nodes (node_type, name, aliases, properties, confidence_score) VALUES
('region', 'Eswatini', '["Swaziland"]', '{"country":true,"climate":"subtropical","agroeco":["lowveld","middleveld","highveld","lubombo"]}', 0.95),
('region', 'South Africa', '["SA","RSA"]', '{"country":true,"climate":"varied","agroeco":["highveld","lowveld","bushveld","karoo"]}', 0.95),
('region', 'Mozambique', '["Mocambique"]', '{"country":true,"climate":"tropical","agroeco":["coastal","central_plateau","northern"]}', 0.90),
('region', 'Zimbabwe', '["Zim"]', '{"country":true,"climate":"tropical_subtropical","agroeco":["highveld","lowveld","eastern_highlands"]}', 0.90),
('region', 'Kenya', '["KE"]', '{"country":true,"climate":"varied","agroeco":["central_highlands","coastal","lake_region","arid"]}', 0.90),
('region', 'Tanzania', '["TZ"]', '{"country":true,"climate":"tropical","agroeco":["coastal","lake","highlands","southern"]}', 0.90),
('region', 'Uganda', '["UG"]', '{"country":true,"climate":"tropical","agroeco":["lake_victoria","western","northern","eastern"]}', 0.90),
('region', 'Ethiopia', '["ET"]', '{"country":true,"climate":"varied","agroeco":["highlands","rift_valley","lowlands"]}', 0.90),
('region', 'Nigeria', '["NG"]', '{"country":true,"climate":"varied","agroeco":["guinea_savanna","sudan_savanna","forest","sahel"]}', 0.90),
('region', 'Ghana', '["GH"]', '{"country":true,"climate":"tropical","agroeco":["coastal","forest","transitional","savanna"]}', 0.85),
('region', 'Malawi', '["MW"]', '{"country":true,"climate":"subtropical","agroeco":["lakeshore","highlands","shire_valley"]}', 0.85),
('region', 'Zambia', '["ZM"]', '{"country":true,"climate":"tropical","agroeco":["northern","central","southern","western"]}', 0.85),
('region', 'Rwanda', '["RW"]', '{"country":true,"climate":"tropical_highland","agroeco":["highlands","eastern_plateau"]}', 0.85),
('region', 'Cameroon', '["CM"]', '{"country":true,"climate":"varied","agroeco":["forest","grasslands","sahel","coastal"]}', 0.80),
('region', 'Senegal', '["SN"]', '{"country":true,"climate":"tropical","agroeco":["groundnut_basin","casamance","river_valley"]}', 0.80),
('region', 'Mali', '["ML"]', '{"country":true,"climate":"sahel","agroeco":["niger_delta","southern","sahel"]}', 0.80),
('region', 'Burkina Faso', '["BF"]', '{"country":true,"climate":"sahel","agroeco":["sudano_sahelian","sudanian"]}', 0.80),
('region', 'DR Congo', '["DRC","Congo"]', '{"country":true,"climate":"tropical","agroeco":["equatorial_forest","eastern_highlands","savanna"]}', 0.80),
('region', 'Madagascar', '["MG"]', '{"country":true,"climate":"varied","agroeco":["highlands","eastern_coast","western_dry"]}', 0.80),
('region', 'Ivory Coast', '["Cote dIvoire"]', '{"country":true,"climate":"tropical","agroeco":["forest","savanna","coastal"]}', 0.80),
('region', 'Angola', '["AO"]', '{"country":true,"climate":"varied","agroeco":["central_plateau","northern","coastal","southern"]}', 0.75),
('region', 'Sudan', '["SD"]', '{"country":true,"climate":"arid_semiarid","agroeco":["gezira","darfur","nile_valley"]}', 0.80),
('region', 'Botswana', '["BW"]', '{"country":true,"climate":"semi_arid","agroeco":["kalahari","northern","eastern"]}', 0.80),
('region', 'Namibia', '["NA"]', '{"country":true,"climate":"arid","agroeco":["caprivi","central","southern"]}', 0.75),
('region', 'Lesotho', '["LS"]', '{"country":true,"climate":"temperate","agroeco":["highlands","lowlands","foothills"]}', 0.80),
('region', 'Limpopo', '["Limpopo Province"]', '{"province":true,"country":"South Africa","climate":"subtropical","agroeco":["bushveld","lowveld"]}', 0.85),
('region', 'KwaZulu-Natal', '["KZN"]', '{"province":true,"country":"South Africa","climate":"subtropical","agroeco":["coastal","midlands","highlands"]}', 0.85),
('region', 'Mpumalanga', '["MP"]', '{"province":true,"country":"South Africa","climate":"subtropical","agroeco":["highveld","lowveld"]}', 0.85),
('region', 'Hhohho', '["Hhohho Region"]', '{"region":true,"country":"Eswatini","climate":"subtropical_highland","agroeco":["highveld","middleveld"]}', 0.80),
('region', 'Lubombo', '["Lubombo Region"]', '{"region":true,"country":"Eswatini","climate":"subtropical_lowveld","agroeco":["lubombo_plateau","lowveld"]}', 0.80);

-- ===== SEED EDGES (key relationships) =====

-- Fall Armyworm affects major crops
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.95, '{"severity":"high","damage":"severe_defoliation","yield_loss_pct":40}', 50
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Fall Armyworm' AND c.name = 'Maize';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.80, '{"severity":"medium","damage":"leaf_feeding","yield_loss_pct":25}', 30
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Fall Armyworm' AND c.name = 'Sorghum';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.75, '{"severity":"medium","damage":"leaf_feeding","yield_loss_pct":20}', 20
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Fall Armyworm' AND c.name = 'Rice';

-- Treatments for Fall Armyworm
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.90, '{"efficacy":"high","timing":"early_instar","application":"foliar_spray"}', 40
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Bt (Bacillus thuringiensis)' AND p.name = 'Fall Armyworm';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.85, '{"efficacy":"high","timing":"early_instar","application":"foliar_spray"}', 35
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Emamectin Benzoate' AND p.name = 'Fall Armyworm';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.90, '{"efficacy":"high","timing":"preventive","application":"field_design"}', 30
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Push-Pull Technology' AND p.name = 'Fall Armyworm';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.80, '{"efficacy":"medium","timing":"early_instar","application":"foliar_spray"}', 25
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Neem Oil' AND p.name = 'Fall Armyworm';

-- Late Blight affects tomato & potato
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.95, '{"severity":"very_high","damage":"complete_crop_loss","yield_loss_pct":100}', 50
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Late Blight' AND c.name = 'Tomato';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.95, '{"severity":"very_high","damage":"tuber_rot","yield_loss_pct":80}', 50
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Late Blight' AND c.name = 'Potato';

-- Treatments for Late Blight
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.90, '{"efficacy":"high","timing":"preventive","application":"foliar_spray_7day_interval"}', 40
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Mancozeb' AND p.name = 'Late Blight';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.85, '{"efficacy":"high","timing":"curative","application":"foliar_spray"}', 35
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Metalaxyl' AND p.name = 'Late Blight';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.80, '{"efficacy":"medium","timing":"preventive","application":"foliar_spray"}', 30
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Copper Oxychloride' AND p.name = 'Late Blight';

-- Aphids affect multiple crops
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.85, '{"severity":"medium","damage":"sap_sucking_virus_vector"}', 40
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Aphid' AND c.name IN ('Cabbage', 'Tomato', 'Pepper', 'Cowpea', 'Common Bean');

-- Treatments for aphids
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.85, '{"efficacy":"high","application":"foliar_spray"}', 35
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Neem Oil' AND p.name = 'Aphid';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.80, '{"efficacy":"medium","application":"foliar_spray"}', 25
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Organic Soap Spray' AND p.name = 'Aphid';

-- Maize grows in various soil types
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, s.id, 'grows_in', 0.95, '{"suitability":"excellent"}', 50
FROM public.knowledge_nodes c, public.knowledge_nodes s
WHERE c.name = 'Maize' AND s.name = 'Loamy Soil';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, s.id, 'grows_in', 0.80, '{"suitability":"good","note":"needs_drainage"}', 30
FROM public.knowledge_nodes c, public.knowledge_nodes s
WHERE c.name = 'Maize' AND s.name = 'Sandy Loam';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, s.id, 'grows_in', 0.65, '{"suitability":"moderate","note":"poor_drainage_risk"}', 20
FROM public.knowledge_nodes c, public.knowledge_nodes s
WHERE c.name = 'Maize' AND s.name = 'Clay Soil';

-- Seasonal relationships
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, s.id, 'seasonal_for', 0.90, '{"planting_months":[10,11,12],"harvest_months":[3,4,5]}', 40
FROM public.knowledge_nodes c, public.knowledge_nodes s
WHERE c.name = 'Maize' AND s.name = 'Summer';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, s.id, 'seasonal_for', 0.85, '{"planting_months":[4,5],"harvest_months":[8,9]}', 30
FROM public.knowledge_nodes c, public.knowledge_nodes s
WHERE c.name = 'Wheat' AND s.name = 'Winter';

-- Regional relationships
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, r.id, 'found_in', 0.95, '{"prevalence":"major_crop","production_area_ha":50000}', 50
FROM public.knowledge_nodes c, public.knowledge_nodes r
WHERE c.name = 'Maize' AND r.name = 'Eswatini';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c.id, r.id, 'found_in', 0.90, '{"prevalence":"major_crop"}', 40
FROM public.knowledge_nodes c, public.knowledge_nodes r
WHERE c.name = 'Sugarcane' AND r.name = 'Eswatini';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, r.id, 'found_in', 0.90, '{"prevalence":"widespread","first_detected":2016}', 40
FROM public.knowledge_nodes p, public.knowledge_nodes r
WHERE p.name = 'Fall Armyworm' AND r.name = 'Eswatini';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, r.id, 'found_in', 0.90, '{"prevalence":"widespread"}', 40
FROM public.knowledge_nodes p, public.knowledge_nodes r
WHERE p.name = 'Fall Armyworm' AND r.name = 'South Africa';

-- Companion planting
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c1.id, c2.id, 'companion_to', 0.85, '{"benefit":"nitrogen_fixation","traditional":true}', 30
FROM public.knowledge_nodes c1, public.knowledge_nodes c2
WHERE c1.name = 'Maize' AND c2.name = 'Common Bean';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT c1.id, c2.id, 'companion_to', 0.80, '{"benefit":"ground_cover_moisture","traditional":true}', 25
FROM public.knowledge_nodes c1, public.knowledge_nodes c2
WHERE c1.name = 'Maize' AND c2.name = 'Pumpkin';

-- Tuta absoluta on tomato
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, c.id, 'affects', 0.95, '{"severity":"very_high","damage":"leaf_fruit_mining","yield_loss_pct":80}', 45
FROM public.knowledge_nodes p, public.knowledge_nodes c
WHERE p.name = 'Tuta absoluta' AND c.name = 'Tomato';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, p.id, 'treats', 0.85, '{"efficacy":"high","timing":"early_detection","application":"foliar_spray"}', 30
FROM public.knowledge_nodes t, public.knowledge_nodes p
WHERE t.name = 'Spinosad' AND p.name = 'Tuta absoluta';

-- Cassava Mosaic
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT d.id, c.id, 'affects', 0.95, '{"severity":"very_high","yield_loss_pct":70}', 45
FROM public.knowledge_nodes d, public.knowledge_nodes c
WHERE d.name = 'Cassava Mosaic Disease' AND c.name = 'Cassava';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT t.id, d.id, 'treats', 0.90, '{"efficacy":"high","note":"use_CMD_resistant_varieties"}', 40
FROM public.knowledge_nodes t, public.knowledge_nodes d
WHERE t.name = 'Resistant Varieties' AND d.name = 'Cassava Mosaic Disease';

-- Witchweed/Striga on cereals
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT d.id, c.id, 'affects', 0.90, '{"severity":"high","yield_loss_pct":60}', 35
FROM public.knowledge_nodes d, public.knowledge_nodes c
WHERE d.name = 'Witchweed' AND c.name IN ('Maize', 'Sorghum', 'Millet');

-- Soil thrives_in
INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, s.id, 'thrives_in', 0.80, '{"note":"moist_conditions_favor_disease"}', 25
FROM public.knowledge_nodes p, public.knowledge_nodes s
WHERE p.name = 'Late Blight' AND s.name = 'Clay Soil';

INSERT INTO public.knowledge_edges (source_node_id, target_node_id, relationship, weight, metadata, reported_by_count)
SELECT p.id, s.id, 'thrives_in', 0.75, '{"note":"sandy_soils_favor_nematodes"}', 20
FROM public.knowledge_nodes p, public.knowledge_nodes s
WHERE p.name = 'Root Knot Nematode' AND s.name = 'Sandy Soil';
