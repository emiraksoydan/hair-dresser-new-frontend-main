import { BarberType } from "../../types";

export function getBarberTypeName(type: BarberType): string {
    switch (type) {
        case BarberType.MaleHairdresser: return 'Erkek Berberi';
        case BarberType.FemaleHairdresser: return 'Kadın Kuaförü';
        case BarberType.BeautySalon: return 'Güzellik Salonu';
        default: return 'Tanımsız';
    }
}