import { useMemo, useCallback } from 'react';
import { useGetCategoryHierarchyQuery } from '../store/api';
import { CategoryHierarchyDto } from '../types/common';

interface CategoryItem {
  id: string;
  name: string;
  parentId?: string | null;
}

interface ParentHierarchyResult {
  mainHeadings: string[];
  subHeadings: string[];
}

interface UseCategoryHierarchyOptions {
  selectedType?: string | null;
  // FreeBarber için çoklu type seçimi (Erkek Berber + Bayan Kuaför)
  selectedTypes?: string[];
  selectedMainHeadings?: string[];
  selectedSubHeadings?: string[];
  // FreeBarber için güzellik salonu ayrımı
  selectedBeautySalonMainHeadings?: string[];
  selectedBeautySalonSubHeadings?: string[];
}

interface UseCategoryHierarchyResult {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  // Ana kategoriler (Kuaför, Güzellik Salonu)
  parentCategories: CategoryItem[];
  // Seçilen type'ın ana başlıkları
  mainHeadings: CategoryItem[];
  // Seçilen ana başlıkların alt başlıkları
  subHeadings: CategoryItem[];
  // Seçilen alt başlıkların hizmetleri
  services: CategoryItem[];
  // Güzellik salonu için ayrı liste
  beautySalonMainHeadings: CategoryItem[];
  beautySalonSubHeadings: CategoryItem[];
  beautySalonServices: CategoryItem[];
  // Hizmet isimlerinden geriye doğru ana başlık ve alt başlık bul
  findParentHierarchyFromServices: (
    serviceNames: string[],
    typeName: string
  ) => ParentHierarchyResult;
  // Tüm hizmetleri bir type altında getir (tüm main -> sub -> services)
  getAllServicesForType: (typeName: string) => CategoryItem[];
}

// Hiyerarşik yapıdan düz listeye dönüştür
const flattenCategory = (category: CategoryHierarchyDto, parentId?: string): CategoryItem => ({
  id: category.id,
  name: category.name,
  parentId: parentId || null,
});

// Belirli bir parent'ın children'larını bul
const findChildrenByParentName = (
  hierarchy: CategoryHierarchyDto[],
  parentName: string
): CategoryHierarchyDto[] => {
  for (const category of hierarchy) {
    if (category.name === parentName) {
      return category.children || [];
    }
    const found = findChildrenByParentName(category.children || [], parentName);
    if (found.length > 0) return found;
  }
  return [];
};

// Birden fazla parent name için children'ları birleştir
const findChildrenByParentNames = (
  hierarchy: CategoryHierarchyDto[],
  parentNames: string[]
): CategoryHierarchyDto[] => {
  const result: CategoryHierarchyDto[] = [];
  const seenIds = new Set<string>();

  for (const parentName of parentNames) {
    const children = findChildrenByParentName(hierarchy, parentName);
    for (const child of children) {
      if (!seenIds.has(child.id)) {
        seenIds.add(child.id);
        result.push(child);
      }
    }
  }

  return result;
};

export const useCategoryHierarchy = (
  options: UseCategoryHierarchyOptions = {}
): UseCategoryHierarchyResult => {
  const {
    selectedType,
    selectedTypes = [],
    selectedMainHeadings = [],
    selectedSubHeadings = [],
    selectedBeautySalonMainHeadings = [],
    selectedBeautySalonSubHeadings = [],
  } = options;

  const { data: hierarchy = [], isLoading, isError, refetch } = useGetCategoryHierarchyQuery();

  // Ana kategoriler (en üst seviye)
  const parentCategories = useMemo(() => {
    return hierarchy.map((cat) => flattenCategory(cat));
  }, [hierarchy]);

  // Seçilen type'ın ana başlıkları (tek veya çoklu type desteği)
  const mainHeadings = useMemo(() => {
    // Çoklu type seçimi varsa onu kullan
    if (selectedTypes.length > 0) {
      const allChildren: CategoryHierarchyDto[] = [];
      const seenIds = new Set<string>();

      for (const typeName of selectedTypes) {
        const children = findChildrenByParentName(hierarchy, typeName);
        for (const child of children) {
          if (!seenIds.has(child.id)) {
            seenIds.add(child.id);
            allChildren.push(child);
          }
        }
      }
      return allChildren.map((cat) => flattenCategory(cat));
    }

    // Tek type seçimi
    if (!selectedType) return [];
    const children = findChildrenByParentName(hierarchy, selectedType);
    return children.map((cat) => flattenCategory(cat, selectedType));
  }, [hierarchy, selectedType, selectedTypes]);

  // Seçilen ana başlıkların alt başlıkları
  const subHeadings = useMemo(() => {
    if (selectedMainHeadings.length === 0) return [];
    const children = findChildrenByParentNames(hierarchy, selectedMainHeadings);
    return children.map((cat) => flattenCategory(cat));
  }, [hierarchy, selectedMainHeadings]);

  // Seçilen alt başlıkların hizmetleri
  const services = useMemo(() => {
    if (selectedSubHeadings.length === 0) return [];
    const children = findChildrenByParentNames(hierarchy, selectedSubHeadings);
    return children.map((cat) => flattenCategory(cat));
  }, [hierarchy, selectedSubHeadings]);

  // Güzellik Salonu için ayrı hesaplamalar
  const beautySalonMainHeadings = useMemo(() => {
    const beautySalon = hierarchy.find((cat) => cat.name === 'Güzellik Salonu');
    if (!beautySalon) return [];
    return (beautySalon.children || []).map((cat) => flattenCategory(cat, beautySalon.id));
  }, [hierarchy]);

  const beautySalonSubHeadings = useMemo(() => {
    if (selectedBeautySalonMainHeadings.length === 0) return [];
    const children = findChildrenByParentNames(hierarchy, selectedBeautySalonMainHeadings);
    return children.map((cat) => flattenCategory(cat));
  }, [hierarchy, selectedBeautySalonMainHeadings]);

  const beautySalonServices = useMemo(() => {
    if (selectedBeautySalonSubHeadings.length === 0) return [];
    const children = findChildrenByParentNames(hierarchy, selectedBeautySalonSubHeadings);
    return children.map((cat) => flattenCategory(cat));
  }, [hierarchy, selectedBeautySalonSubHeadings]);

  // Hizmet isimlerinden geriye doğru ana başlık ve alt başlık bul
  const findParentHierarchyFromServices = useCallback(
    (serviceNames: string[], typeName: string): ParentHierarchyResult => {
      const foundMainHeadings = new Set<string>();
      const foundSubHeadings = new Set<string>();

      // Type'ı bul
      const typeCategory = hierarchy.find((cat) => cat.name === typeName);
      if (!typeCategory) return { mainHeadings: [], subHeadings: [] };

      // Her bir main heading için
      for (const mainHeading of typeCategory.children || []) {
        // Her bir sub heading için
        for (const subHeading of mainHeading.children || []) {
          // Her bir service için
          for (const service of subHeading.children || []) {
            if (serviceNames.includes(service.name)) {
              foundMainHeadings.add(mainHeading.name);
              foundSubHeadings.add(subHeading.name);
            }
          }
        }
      }

      return {
        mainHeadings: Array.from(foundMainHeadings),
        subHeadings: Array.from(foundSubHeadings),
      };
    },
    [hierarchy]
  );

  // Tüm hizmetleri bir type altında getir
  const getAllServicesForType = useCallback(
    (typeName: string): CategoryItem[] => {
      const allServices: CategoryItem[] = [];
      const seenIds = new Set<string>();

      const typeCategory = hierarchy.find((cat) => cat.name === typeName);
      if (!typeCategory) return [];

      for (const mainHeading of typeCategory.children || []) {
        for (const subHeading of mainHeading.children || []) {
          for (const service of subHeading.children || []) {
            if (!seenIds.has(service.id)) {
              seenIds.add(service.id);
              allServices.push(flattenCategory(service, subHeading.id));
            }
          }
        }
      }

      return allServices;
    },
    [hierarchy]
  );

  return {
    isLoading,
    isError,
    refetch,
    parentCategories,
    mainHeadings,
    subHeadings,
    services,
    beautySalonMainHeadings,
    beautySalonSubHeadings,
    beautySalonServices,
    findParentHierarchyFromServices,
    getAllServicesForType,
  };
};
