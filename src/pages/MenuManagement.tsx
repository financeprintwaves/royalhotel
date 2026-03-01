import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, MenuItem, BillingType, PortionOption } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, UtensilsCrossed, FolderOpen, ImageIcon, X, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  createMenuItemForBranch,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  updateMenuItemWithPortions,
} from '@/services/menuService';
import { createInventoryEntry } from '@/services/inventoryService';
import { useBranches } from '@/hooks/useMenuData';
import BranchSelector from '@/components/BranchSelector';

export default function MenuManagement() {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  const isAdmin = roles.includes('admin');

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(0);
  const [categoryRequiresKitchen, setCategoryRequiresKitchen] = useState(false);

  // Menu item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<string>('');
  const [itemBranchId, setItemBranchId] = useState<string>('');
  const [createInventory, setCreateInventory] = useState(true);
  const [initialStock, setInitialStock] = useState('50');
  
  // Bar product fields
  const [billingType, setBillingType] = useState<BillingType>('bottle_only');
  const [bottleSizeMl, setBottleSizeMl] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [servingSizeMl, setServingSizeMl] = useState('60');
  const [servingPrice, setServingPrice] = useState('');
  
  // Portion options state
  const [portionOptions, setPortionOptions] = useState<PortionOption[]>([]);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'item'; id: string; name: string } | null>(null);

  const isManager = roles.includes('admin') || roles.includes('manager');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getCategories(),
        getMenuItems(),
      ]);
      setCategories(categoriesData);
      setMenuItems(itemsData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  // Category handlers
  function openCategoryDialog(category?: Category) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
      setCategorySortOrder(category.sort_order || 0);
      setCategoryRequiresKitchen(category.requires_kitchen || false);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategorySortOrder(categories.length);
      setCategoryRequiresKitchen(false);
    }
    setCategoryDialogOpen(true);
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Category name is required' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          sort_order: categorySortOrder,
          requires_kitchen: categoryRequiresKitchen,
        });
        toast({ title: 'Success', description: 'Category updated' });
      } else {
        const newCategory = await createCategory(categoryName, categoryDescription || undefined, categorySortOrder);
        // Update requires_kitchen after creation
        await updateCategory(newCategory.id, { requires_kitchen: categoryRequiresKitchen });
        toast({ title: 'Success', description: 'Category created' });
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  // Menu item handlers
  function openItemDialog(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemPrice(item.price.toString());
      setItemDescription(item.description || '');
      setItemImageUrl(item.image_url || '');
      setItemCategoryId(item.category_id || '');
      setItemBranchId(item.branch_id || '');
      setCreateInventory(false);
      // Bar fields
      setBillingType(item.billing_type || 'bottle_only');
      setBottleSizeMl(item.bottle_size_ml?.toString() || '');
      setCostPrice(item.cost_price?.toString() || '');
      setServingSizeMl(item.serving_size_ml?.toString() || '60');
      setServingPrice(item.serving_price?.toString() || '');
      // Portion options - parse from JSON string if needed
      const rawPortions = item.portion_options;
      let parsedPortions: PortionOption[] = [];
      if (typeof rawPortions === 'string') {
        try {
          parsedPortions = JSON.parse(rawPortions);
        } catch {
          parsedPortions = [];
        }
      } else if (Array.isArray(rawPortions)) {
        // Convert size_ml to size for backward compatibility
        parsedPortions = rawPortions.map(p => ({
          ...p,
          size: p.size || (p.size_ml ? `${p.size_ml}ml` : undefined)
        }));
      }
      setPortionOptions(parsedPortions);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setItemImageUrl('');
      setItemCategoryId(selectedCategory || '');
      setItemBranchId(selectedBranchId || profile?.branch_id || '');
      setCreateInventory(true);
      setInitialStock('50');
      // Reset bar fields
      setBillingType('bottle_only');
      setBottleSizeMl('');
      setCostPrice('');
      setServingSizeMl('60');
      setServingPrice('');
      // Reset portion options
      setPortionOptions([]);
      // Reset multi-branch selection
      setSelectedBranchIds([]);
    }
    setItemDialogOpen(true);
  }

  function addPortionOption() {
    setPortionOptions(prev => [...prev, { name: '', price: 0 }]);
  }

  function updatePortionOption(index: number, field: keyof PortionOption, value: string | number) {
    setPortionOptions(prev => prev.map((opt, i) => 
      i === index ? { ...opt, [field]: value } : opt
    ));
  }

  function removePortionOption(index: number) {
    setPortionOptions(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSaveItem() {
    if (!itemName.trim() || !itemPrice) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and price are required' });
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid price' });
      return;
    }

    // Validate portion options
    const validPortions = portionOptions.filter(p => p.name.trim() && p.price > 0);

    try {
      if (editingItem) {
        await updateMenuItemWithPortions(editingItem.id, {
          name: itemName,
          price,
          description: itemDescription || undefined,
          image_url: itemImageUrl || undefined,
          category_id: itemCategoryId || undefined,
          billing_type: billingType,
          bottle_size_ml: bottleSizeMl ? parseInt(bottleSizeMl) : null,
          cost_price: costPrice ? parseFloat(costPrice) : null,
          serving_size_ml: servingSizeMl ? parseInt(servingSizeMl) : null,
          serving_price: servingPrice ? parseFloat(servingPrice) : null,
          portion_options: validPortions.length > 0 ? validPortions : null,
        });
        toast({ title: 'Success', description: 'Menu item updated' });
      } else {
        const itemOptions = {
          name: itemName,
          price,
          categoryId: itemCategoryId || undefined,
          description: itemDescription || undefined,
          imageUrl: itemImageUrl || undefined,
          billingType,
          bottleSizeMl: bottleSizeMl ? parseInt(bottleSizeMl) : undefined,
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          servingSizeMl: servingSizeMl ? parseInt(servingSizeMl) : undefined,
          servingPrice: servingPrice ? parseFloat(servingPrice) : undefined,
          portionOptions: validPortions.length > 0 ? validPortions : undefined,
        };

        // Multi-branch creation for admins
        const branchesToCreate = isAdmin && selectedBranchIds.length > 0 
          ? selectedBranchIds 
          : [itemBranchId || profile?.branch_id || ''];
        
        for (const branchId of branchesToCreate) {
          if (!branchId) continue;
          const newItem = await createMenuItemForBranch(branchId, itemOptions);
          
          // Create inventory entry if requested
          if (createInventory) {
            const stock = parseInt(initialStock) || 0;
            await createInventoryEntry(newItem.id, stock);
          }
        }
        
        const branchCount = branchesToCreate.filter(b => b).length;
        toast({ 
          title: 'Success', 
          description: branchCount > 1 
            ? `Menu item created in ${branchCount} branches` 
            : 'Menu item created' 
        });
      }
      setItemDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    try {
      await toggleMenuItemAvailability(item.id);
      toast({ title: 'Success', description: `${item.name} is now ${item.is_available ? 'unavailable' : 'available'}` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  // Delete handlers
  function confirmDelete(type: 'category' | 'item', id: string, name: string) {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.id);
        toast({ title: 'Success', description: 'Category deleted' });
      } else {
        await deleteMenuItem(deleteTarget.id);
        toast({ title: 'Success', description: 'Menu item deleted' });
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to manage the menu.
            </p>
            <Button className="w-full mt-4" asChild>
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Menu Management</h1>
            </div>
          </div>
          <BranchSelector 
            selectedBranchId={selectedBranchId} 
            onBranchChange={setSelectedBranchId}
          />
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">Menu Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Menu Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedCategory || 'all'}
                  onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {filteredItems.length} items
                </span>
              </div>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openItemDialog()}>
                    <Plus className="h-4 w-4 mr-2" />Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Margherita Pizza" />
                      </div>
                      <div className="space-y-2">
                        <Label>Base Price * (OMR)</Label>
                        <Input type="number" step="0.001" min="0" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="0.000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Optional description" />
                      </div>
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input value={itemImageUrl} onChange={(e) => setItemImageUrl(e.target.value)} placeholder="https://..." />
                      </div>
                      {isAdmin && !editingItem && (
                        <div className="space-y-2">
                          <Label>Branches</Label>
                          <p className="text-xs text-muted-foreground">Select branches to add this item</p>
                          <div className="space-y-2 max-h-32 overflow-auto border rounded-md p-2">
                            {branches.map((branch) => (
                              <div key={branch.id} className="flex items-center gap-2">
                                <Checkbox 
                                  id={`branch-${branch.id}`}
                                  checked={selectedBranchIds.includes(branch.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedBranchIds(prev => [...prev, branch.id]);
                                    } else {
                                      setSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`branch-${branch.id}`} className="cursor-pointer">{branch.name}</Label>
                              </div>
                            ))}
                          </div>
                          {selectedBranchIds.length > 0 && (
                            <p className="text-xs text-primary">{selectedBranchIds.length} branch(es) selected</p>
                          )}
                        </div>
                      )}

                      {/* Portion Options Section */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-semibold">Portion Options</Label>
                            <p className="text-xs text-muted-foreground">Add Small/Medium/Large sizes with different prices</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addPortionOption}>
                            <Plus className="h-3 w-3 mr-1" />Add
                          </Button>
                        </div>
                        
                        {portionOptions.length > 0 && (
                          <div className="space-y-2">
                            {portionOptions.map((portion, index) => (
                              <div key={index} className="flex gap-2 items-center p-2 bg-muted/50 rounded-md">
                                <Input
                                  placeholder="Name (e.g., Small)"
                                  value={portion.name}
                                  onChange={(e) => updatePortionOption(index, 'name', e.target.value)}
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  placeholder="Price"
                                  value={portion.price || ''}
                                  onChange={(e) => updatePortionOption(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                />
                                <Input
                                  type="text"
                                  placeholder="Size (optional)"
                                  value={portion.size || ''}
                                  onChange={(e) => updatePortionOption(index, 'size', e.target.value)}
                                  className="w-28"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removePortionOption(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!editingItem && (
                        <>
                          <div className="flex items-center justify-between pt-4 border-t">
                            <Label>Create inventory entry</Label>
                            <Switch checked={createInventory} onCheckedChange={setCreateInventory} />
                          </div>
                          {createInventory && (
                            <div className="space-y-2">
                              <Label>Initial Stock</Label>
                              <Input type="number" min="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveItem}>{editingItem ? 'Update' : 'Create'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
                  <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {!item.is_available && (
                      <Badge className="absolute top-2 right-2" variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-lg font-bold text-primary">{item.price.toFixed(3)} OMR</p>
                        {item.category && (
                          <Badge variant="outline" className="mt-1">{item.category.name}</Badge>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Available</span>
                        <Switch checked={item.is_available} onCheckedChange={() => handleToggleAvailability(item)} />
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openItemDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirmDelete('item', item.id, item.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <Card className="p-12 text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No menu items yet. Add your first item to get started.</p>
              </Card>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openCategoryDialog()}>
                    <Plus className="h-4 w-4 mr-2" />Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Appetizers" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="Optional description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input type="number" value={categorySortOrder} onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Kitchen Item</Label>
                        <p className="text-xs text-muted-foreground">Items in this category are sent to kitchen for preparation</p>
                      </div>
                      <Switch checked={categoryRequiresKitchen} onCheckedChange={setCategoryRequiresKitchen} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveCategory}>{editingCategory ? 'Update' : 'Create'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const itemCount = menuItems.filter(item => item.category_id === category.id).length;
                return (
                  <Card key={category.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openCategoryDialog(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirmDelete('category', category.id, category.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      )}
                      <div className="flex gap-2">
                        <Badge variant="secondary">{itemCount} items</Badge>
                        {category.requires_kitchen && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">Kitchen</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {categories.length === 0 && (
              <Card className="p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No categories yet. Add your first category to organize your menu.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'category' ? 'Category' : 'Menu Item'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}