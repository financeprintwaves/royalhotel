
-- Create Arabic Bar and Indian Bar branches with complete setup
-- Fixed UUIDs for consistent reference
DO $$
DECLARE
  v_arb_id uuid := 'a1111111-1111-1111-1111-111111111111';
  v_inb_id uuid := 'b2222222-2222-2222-2222-222222222222';
  v_branch_id uuid;
  v_cat_beer uuid;
  v_cat_whiskey uuid;
  v_cat_rum uuid;
  v_cat_vodka uuid;
  v_cat_gin uuid;
  v_cat_tequila uuid;
  v_cat_champagne uuid;
  v_cat_wine uuid;
  v_cat_softdrink uuid;
  v_cat_extra uuid;
  v_item_id uuid;
  i integer;
BEGIN
  -- Loop through both branches
  FOR v_branch_id IN SELECT unnest(ARRAY[v_arb_id, v_inb_id])
  LOOP
    -- Create branch if not exists
    INSERT INTO public.branches (id, name, address, phone, order_prefix)
    VALUES (
      v_branch_id,
      CASE WHEN v_branch_id = v_arb_id THEN 'Arabic Bar' ELSE 'Indian Bar' END,
      CASE WHEN v_branch_id = v_arb_id THEN 'Arabic Bar Location' ELSE 'Indian Bar Location' END,
      '+968 1234 5678',
      CASE WHEN v_branch_id = v_arb_id THEN 'ARB' ELSE 'INB' END
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- Create categories
    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Beer', 'Draft and bottled beers', 1)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_beer;
    IF v_cat_beer IS NULL THEN
      SELECT id INTO v_cat_beer FROM public.categories WHERE branch_id = v_branch_id AND name = 'Beer';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Whiskey', 'Premium whiskeys', 2)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_whiskey;
    IF v_cat_whiskey IS NULL THEN
      SELECT id INTO v_cat_whiskey FROM public.categories WHERE branch_id = v_branch_id AND name = 'Whiskey';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Rum', 'Rum selections', 3)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_rum;
    IF v_cat_rum IS NULL THEN
      SELECT id INTO v_cat_rum FROM public.categories WHERE branch_id = v_branch_id AND name = 'Rum';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Vodka', 'Vodka selections', 4)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_vodka;
    IF v_cat_vodka IS NULL THEN
      SELECT id INTO v_cat_vodka FROM public.categories WHERE branch_id = v_branch_id AND name = 'Vodka';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Gin', 'Gin selections', 5)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_gin;
    IF v_cat_gin IS NULL THEN
      SELECT id INTO v_cat_gin FROM public.categories WHERE branch_id = v_branch_id AND name = 'Gin';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Tequila', 'Tequila selections', 6)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_tequila;
    IF v_cat_tequila IS NULL THEN
      SELECT id INTO v_cat_tequila FROM public.categories WHERE branch_id = v_branch_id AND name = 'Tequila';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Champagne', 'Champagne and sparkling', 7)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_champagne;
    IF v_cat_champagne IS NULL THEN
      SELECT id INTO v_cat_champagne FROM public.categories WHERE branch_id = v_branch_id AND name = 'Champagne';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Wine', 'Wine selections', 8)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_wine;
    IF v_cat_wine IS NULL THEN
      SELECT id INTO v_cat_wine FROM public.categories WHERE branch_id = v_branch_id AND name = 'Wine';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Soft Drink', 'Non-alcoholic beverages', 9)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_softdrink;
    IF v_cat_softdrink IS NULL THEN
      SELECT id INTO v_cat_softdrink FROM public.categories WHERE branch_id = v_branch_id AND name = 'Soft Drink';
    END IF;

    INSERT INTO public.categories (branch_id, name, description, sort_order)
    VALUES (v_branch_id, 'Extra', 'Food and extras', 10)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_cat_extra;
    IF v_cat_extra IS NULL THEN
      SELECT id INTO v_cat_extra FROM public.categories WHERE branch_id = v_branch_id AND name = 'Extra';
    END IF;

    -- ============ BEERS (billing_type: bottle_only, stock: 100) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Heineken', 3.000, 1.024, 330, 'bottle_only', '330ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Cody''s', 2.500, 1.151, 500, 'bottle_only', '500ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Tiger', 2.800, 0.963, 500, 'bottle_only', '500ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Dab', 3.500, 0.984, 330, 'bottle_only', '330ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Kingfisher Red', 3.500, 1.666, 650, 'bottle_only', '650ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Kingfisher Green', 3.500, 1.666, 650, 'bottle_only', '650ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Kingfisher Blue', 2.500, 0.875, 500, 'bottle_only', '500ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Amster Red', 3.000, 0.995, 500, 'bottle_only', '500ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_beer, 'Blue Ribbon', 2.000, 0.696, 470, 'bottle_only', '470ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    -- ============ WHISKEY (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'Zack Daniel', 30.000, 16.695, 750, 60, 3.400, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'Mr. Boston', 12.000, 3.255, 1000, 60, 2.000, 'by_serving', '1000ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 1000, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'The Famous Grouse', 25.000, 15.750, 750, 60, 2.800, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'Chivas 12', 55.000, 41.790, 750, 60, 4.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'Black & Gold', 16.000, 3.244, 750, 60, 2.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_whiskey, 'Jameson', 35.000, 21.630, 750, 60, 3.800, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    -- ============ RUM (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_rum, 'Mr Boston Silver', 11.000, 5.565, 1750, 60, 2.500, 'by_serving', '1750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 1750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_rum, 'Old Monk', 15.000, 3.360, 750, 60, 2.200, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_rum, 'Bacardi', 20.000, 10.500, 750, 60, 3.000, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    -- ============ VODKA (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_vodka, 'Moonwalk', 13.000, 3.171, 750, 60, 2.200, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_vodka, 'Fleschonn''s', 15.000, 2.940, 1000, 60, 2.500, 'by_serving', '1000ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 1000, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_vodka, 'Tito''s', 18.000, 5.670, 750, 60, 3.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_vodka, 'Absolut', 28.000, 12.810, 750, 60, 2.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_vodka, 'Grey Goose', 60.000, 44.310, 1000, 60, 4.000, 'by_serving', '1000ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 1000, 5);

    -- ============ GIN (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_gin, 'Bombay Sapphire', 30.000, 15.540, 750, 60, 3.000, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_gin, 'Beefeater London', 25.000, 13.860, 750, 60, 3.000, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    -- ============ TEQUILA (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_tequila, 'El Charrow White', 20.000, 9.975, 750, 60, 2.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_tequila, 'El Charrow Gold', 22.000, 9.975, 750, 60, 2.500, 'by_serving', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 750, 5);

    -- ============ CHAMPAGNE (billing_type: bottle_only, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_champagne, 'Andre', 25.000, 4.830, 750, 'bottle_only', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 5);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, billing_type, description)
    VALUES (v_branch_id, v_cat_champagne, 'Dark Horse', 25.000, 5.563, 750, 'bottle_only', '750ml bottle')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 5);

    -- ============ WINE (billing_type: by_serving, serving: 60ml, stock: 24) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, cost_price, bottle_size_ml, serving_size_ml, serving_price, billing_type, description)
    VALUES (v_branch_id, v_cat_wine, 'Peter Vella', 0.000, 14.173, 5000, 60, 3.500, 'by_serving', '5000ml box - sold by glass only')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, ml_remaining, low_stock_threshold) VALUES (v_branch_id, v_item_id, 24, 5000, 5);

    -- ============ SOFT DRINKS (billing_type: bottle_only, stock: 100) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_softdrink, 'Kinza', 1.000, 'bottle_only', 'Soft drink')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_softdrink, 'Pepsi', 1.200, 'bottle_only', 'Soft drink')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_softdrink, 'Redbul', 2.500, 'bottle_only', 'Energy drink')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_softdrink, 'Dew', 1.000, 'bottle_only', 'Soft drink')
    RETURNING id INTO v_item_id;
    INSERT INTO public.inventory (branch_id, menu_item_id, quantity, low_stock_threshold) VALUES (v_branch_id, v_item_id, 100, 10);

    -- ============ EXTRAS/SERVICES (billing_type: service, no stock) ============
    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_extra, 'Salad Half', 2.000, 'service', 'Half portion salad');

    INSERT INTO public.menu_items (branch_id, category_id, name, price, billing_type, description)
    VALUES (v_branch_id, v_cat_extra, 'Salad Full', 3.000, 'service', 'Full portion salad');

    -- ============ CREATE 24 TABLES (6x4 grid layout) ============
    FOR i IN 1..24 LOOP
      INSERT INTO public.restaurant_tables (
        branch_id, 
        table_number, 
        capacity, 
        table_type, 
        position_x, 
        position_y, 
        shape,
        width,
        height
      ) VALUES (
        v_branch_id,
        'T' || i,
        CASE 
          WHEN i <= 8 THEN 4  -- First 8 tables: 4-seater dining
          WHEN i <= 16 THEN 2 -- Next 8 tables: 2-seater bar
          ELSE 6              -- Last 8 tables: 6-seater booths
        END,
        CASE 
          WHEN i <= 8 THEN 'dining'
          WHEN i <= 16 THEN 'bar'
          ELSE 'booth'
        END,
        50 + ((i - 1) % 6) * 150,  -- 6 columns, 150px apart
        50 + ((i - 1) / 6) * 150,  -- 4 rows, 150px apart
        CASE 
          WHEN i <= 8 THEN 'square'
          WHEN i <= 16 THEN 'round'
          ELSE 'rectangle'
        END,
        CASE 
          WHEN i > 16 THEN 160  -- Booths are wider
          ELSE 120
        END,
        120
      );
    END LOOP;

  END LOOP;

  -- Assign all existing staff (without branch) to Arabic Bar
  UPDATE public.profiles
  SET branch_id = v_arb_id, updated_at = now()
  WHERE branch_id IS NULL;

END $$;
